// controllers/attendanceController.js

import Attendance from "./Attendance.js";
import Project from "../project/models/Project.js";
import LocationLog from "./LocationLog.js";
import Employee from "../employee/Employee.js";
import WorkerTaskAssignment from "../worker/models/WorkerTaskAssignment.js";
import nodemailer from "nodemailer";
import { validateGeofence, calculateDistance } from "../../../utils/geofenceUtil.js";

/* ---------------------------------------
   UTILS
--------------------------------------- */

const getTodayString = () => {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
};

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* ---------------------------------------
   EMAIL ALERT
--------------------------------------- */
const sendEmailAlert = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"ERP System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
  } catch (err) {
    console.error("❌ Email error:", err);
  }
};

/* ---------------------------------------
   VALIDATE GEOFENCE
--------------------------------------- */
export const validateAttendanceGeofence = async (req, res) => {
  try {
    const { projectId, latitude, longitude, accuracy } = req.body;
    const companyId = req.user.companyId;

    const project = await Project.findOne({ id: projectId, companyId });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Prepare project geofence information
    const centerLat = project.geofence?.center?.latitude || project.latitude || 0;
    const centerLng = project.geofence?.center?.longitude || project.longitude || 0;
    const radius = project.geofence?.radius || project.geofenceRadius || 100;

    const projectGeofence = {
      center: {
        latitude: centerLat,
        longitude: centerLng
      },
      radius: radius,
      strictMode: project.geofence?.strictMode !== false,
      allowedVariance: project.geofence?.allowedVariance || 10
    };

    // Use enhanced geofence validation
    const userLocation = { latitude, longitude };
    if (accuracy) {
      userLocation.accuracy = accuracy;
    }

    const geofenceValidation = validateGeofence(userLocation, projectGeofence);

    return res.json({
      insideGeofence: geofenceValidation.insideGeofence,
      distance: geofenceValidation.distance,
      canProceed: geofenceValidation.isValid,
      message: geofenceValidation.message,
      accuracy: accuracy || null
    });
  } catch (err) {
    console.error("❌ Attendance geofence validation error:", err);
    res.status(500).json({ message: "Geofence validation failed" });
  }
};

/* ---------------------------------------
   SUBMIT ATTENDANCE (CHECK-IN / CHECK-OUT)
--------------------------------------- */
export const submitAttendance = async (req, res) => {
  try {
    const { projectId, session, latitude, longitude } = req.body;
    const { userId, companyId } = req.user;

    /* 1️⃣ Resolve employee */
    const employee = await Employee.findOne({
      userId,
      companyId,
      status: "active"
    });
    if (!employee) return res.status(403).json({ message: "Unauthorized employee" });

    /* 2️⃣ Validate project */
    const project = await Project.findOne({ id: projectId, companyId });
    if (!project) return res.status(404).json({ message: "Project not found" });

    /* 3️⃣ Validate task assignment for today */
    const today = getTodayString(); // format YYYY-MM-DD
    const assignment = await WorkerTaskAssignment.findOne({
      employeeId: employee.id,
      projectId,
      date: today
    });
    if (!assignment) return res.status(400).json({ message: "No task assigned for this project today" });

    /* 4️⃣ Geofence check */
    const distance = getDistanceFromLatLonInMeters(
      latitude,
      longitude,
      project.latitude,
      project.longitude
    );
    if (distance > project.geofenceRadius) return res.status(400).json({ message: "Outside project geofence" });

    /* 5️⃣ Fetch today's attendance */
    let attendance = await Attendance.findOne({ employeeId: employee.id, projectId, date: today });

    /* 6️⃣ Handle check-in */
    if (session === "checkin") {
      if (attendance) {
        if (attendance.checkIn) {
          return res.status(400).json({ message: "Already checked in today" });
        }
        // Update existing attendance
        attendance.checkIn = new Date();
        attendance.pendingCheckout = true;
        attendance.insideGeofenceAtCheckin = true;

        await attendance.save();
        return res.json({ message: "Check-in successful" });
      } else {
        // Create new attendance
        attendance = new Attendance({
          employeeId: employee.id,
          projectId,
          date: today,
         // companyId,
          checkIn: new Date(),
          pendingCheckout: true,
          insideGeofenceAtCheckin: true
        });

        await attendance.save();
        return res.json({ message: "Check-in successful" });
      }
    }

    /* 7️⃣ Handle check-out */
    if (session === "checkout") {
      if (!attendance || !attendance.checkIn) {
        return res.status(400).json({ message: "Cannot check out before checking in" });
      }
      if (attendance.checkOut) {
        return res.status(400).json({ message: "Already checked out today" });
      }

      attendance.checkOut = new Date();
      attendance.pendingCheckout = false;
      attendance.insideGeofenceAtCheckout = true;

      await attendance.save();
      return res.json({ message: "Check-out successful" });
    }

    return res.status(400).json({ message: "Invalid session type" });

  } catch (err) {
    console.error("❌ Attendance error:", err);
    res.status(500).json({ message: "Attendance submission failed" });
  }
};

/* ---------------------------------------
   LOCATION LOGGING + ALERT
--------------------------------------- */
export const logLocation = async (req, res) => {
  try {
    const { projectId, latitude, longitude } = req.body;
    const { userId, companyId } = req.user;

    const employee = await Employee.findOne({ userId, companyId });
    if (!employee) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const project = await Project.findOne({ id: projectId, companyId });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const distance = getDistanceFromLatLonInMeters(
      latitude,
      longitude,
      project.latitude,
      project.longitude
    );

    const insideGeofence = distance <= project.geofenceRadius;

    // Generate next ID for LocationLog
    const lastLocationLog = await LocationLog.findOne().sort({ id: -1 }).select("id");
    const nextLocationId = lastLocationLog ? lastLocationLog.id + 1 : 1;

    await LocationLog.create({
      id: nextLocationId,
      employeeId: employee.id,
      projectId,
      latitude,
      longitude,
      insideGeofence,
      logType: 'CHECK_IN'
    });

    /* 🚨 Alert if outside geofence */
    if (!insideGeofence) {
      await sendEmailAlert({
        to: ["admin@company.com"],
        subject: `🚨 Worker Outside Geofence`,
        html: `<p>${employee.fullName} is outside ${project.projectName}</p>`
      });
    }

    return res.json({ insideGeofence });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Location logging failed" });
  }
};

/* ---------------------------------------
   ATTENDANCE HISTORY
--------------------------------------- */
export const getAttendanceHistory = async (req, res) => {
  try {
    const { projectId } = req.query;
    const { userId, companyId } = req.user;

    const employee = await Employee.findOne({ userId, companyId });
    if (!employee) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const records = await Attendance.find({
      employeeId: employee.id,
      projectId,
      //companyId
    }).sort({ date: -1 });

    res.json({ records });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch attendance history" });
  }
};

/* ---------------------------------------
   GET TODAY'S ATTENDANCE
--------------------------------------- */
export const getTodayAttendance = async (req, res) => {
  try {
    const { userId, companyId } = req.user;

    // Find employee
    const employee = await Employee.findOne({ userId, companyId });
    if (!employee) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Get today's date
    const today = getTodayString();

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      employeeId: employee.id,
      date: today
    });

    if (!attendance) {
      return res.json({
        session: 'NOT_LOGGED_IN',
        checkInTime: null,
        checkOutTime: null,
        lunchStartTime: null,
        lunchEndTime: null,
        overtimeStartTime: null,
        date: today
      });
    }

    res.json({
      session: attendance.checkOut ? 'CHECKED_OUT' : (attendance.checkIn ? 'CHECKED_IN' : 'NOT_LOGGED_IN'),
      checkInTime: attendance.checkIn,
      checkOutTime: attendance.checkOut,
      lunchStartTime: attendance.lunchStartTime || null,
      lunchEndTime: attendance.lunchEndTime || null,
      overtimeStartTime: attendance.overtimeStartTime || null,
      date: attendance.date,
      projectId: attendance.projectId
    });

  } catch (err) {
    console.error('Error fetching today\'s attendance:', err);
    res.status(500).json({ message: "Failed to fetch today's attendance" });
  }
};


