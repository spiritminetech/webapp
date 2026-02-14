import React, { useEffect, useState } from "react";
import {
  Table,
  Select,
  Button,
  message,
  Spin,
  Divider,
  Modal,
  DatePicker,
  Checkbox,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import appConfig from "../../config/app.config.js";

const { Option } = Select;
const { confirm } = Modal;

export default function SupervisorTaskAssignment() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);

  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [taskSequence, setTaskSequence] = useState([]);

  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editedTask, setEditedTask] = useState(null);

  /* -------------------- API HEADERS -------------------- */
  const authHeader = {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };

  /* -------------------- FETCH PROJECTS -------------------- */
  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${appConfig.api.baseURL}/api/supervisor/projects`, authHeader);
      setProjects(res.data.data || []);
    } catch {
      message.error("Failed to load projects");
    }
  };

  /* -------------------- FETCH TASKS -------------------- */
  const fetchTasks = async (projectId) => {
    try {
      const res = await axios.get(`${appConfig.api.baseURL}/api/supervisor/projects/${projectId}/tasks`, authHeader);
      setTasks(res.data || []);
    } catch {
      message.error("Failed to load tasks");
    }
  };

  /* -------------------- FETCH WORKERS -------------------- */
  const fetchWorkers = async (projectId) => {
    try {
      setLoading(true);
      const res = await axios.get(`${appConfig.api.baseURL}/api/supervisor/checked-in-workers/${projectId}`, authHeader);
      console.log("Workers data:", res);
      setWorkers(res.data || []);
    } catch {
      message.error("Failed to load workers");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- FETCH ASSIGNED TASKS -------------------- */
  const fetchAssignedTasks = async (workerId, date) => {
    if (!workerId || !date) return;
    try {
      const res = await axios.get(`${appConfig.api.baseURL}/api/supervisor/worker-tasks`, {
        params: { employeeId: workerId, date: date.format("YYYY-MM-DD") },
        ...authHeader,
      });
      setAssignedTasks(res.data.tasks || []);
    } catch {
      message.error("Failed to fetch assigned tasks");
    }
  };

  /* -------------------- ASSIGN TASKS -------------------- */
  const assignTasks = async () => {
    if (!selectedWorker || !selectedProject || !selectedTasks.length) {
      message.warning("Select project, worker, and tasks first");
      return;
    }

    try {
      await axios.post(
        `${appConfig.api.baseURL}/api/supervisor/assign-task`,
        {
          employeeId: selectedWorker,
          projectId: selectedProject,
          taskIds: selectedTasks,
          date: selectedDate.format("YYYY-MM-DD"),
        },
        authHeader
      );

      message.success("Tasks assigned successfully");
      fetchAssignedTasks(selectedWorker, selectedDate);
      setSelectedTasks([]);
      setTaskSequence([]);
    } catch (err) {
      message.error(err.response?.data?.message || "Task assignment failed");
    }
  };

  /* -------------------- REMOVE QUEUED TASK -------------------- */
  const removeQueuedTask = (assignmentId) => {
    confirm({
      title: "Remove queued task?",
      content: "Active and completed tasks cannot be removed",
      onOk: async () => {
        try {
          await axios.delete(`${appConfig.api.baseURL}/api/supervisor/remove-queued-task`, {
            data: { assignmentId },
            ...authHeader,
          });
          message.success("Task removed successfully");
          fetchAssignedTasks(selectedWorker, selectedDate);
        } catch {
          message.error("Failed to remove task");
        }
      },
    });
  };

  /* -------------------- EDIT QUEUED TASK -------------------- */
  const openEditModal = (task) => {
    setEditedTask(task);
    setEditModal(true);
  };

  const saveEdit = async () => {
    try {
      // Remove old task and assign new one
      await axios.delete(`${appConfig.api.baseURL}/api/supervisor/remove-queued-task`, {
        data: { assignmentId: editedTask.assignmentId },
        ...authHeader,
      });
      await axios.post(
        `${appConfig.api.baseURL}/api/supervisor/assign-task`,
        {
          employeeId: selectedWorker,
          projectId: selectedProject,
          taskIds: [editedTask.taskId],
          date: selectedDate.format("YYYY-MM-DD"),
        },
        authHeader
      );
      message.success("Task updated successfully");
      setEditModal(false);
      fetchAssignedTasks(selectedWorker, selectedDate);
    } catch {
      message.error("Failed to edit task");
    }
  };

  /* -------------------- EFFECTS -------------------- */
  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchTasks(selectedProject);
      fetchWorkers(selectedProject);
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchAssignedTasks(selectedWorker, selectedDate);
  }, [selectedWorker, selectedDate]);

  /* -------------------- UI -------------------- */
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold mb-6">Supervisor Task Assignment</h2>

        {/* Project & Date */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block mb-1 font-medium">Project</label>
            <Select
              className="w-full"
              placeholder="Select Project"
              value={selectedProject}
              onChange={setSelectedProject}
            >
              {projects.map((p) => (
                <Option key={p.id} value={p.id}>
                  {p.projectName}
                </Option>
              ))}
            </Select>
          </div>

          <div className="flex-1">
            <label className="block mb-1 font-medium">Date</label>
            <DatePicker
              className="w-full"
              value={selectedDate}
              onChange={setSelectedDate}
            />
          </div>
        </div>

        {/* Worker Select */}
        <div className="mb-4">
          <label className="block mb-1 font-medium">Worker</label>
          <Select
            className="w-full"
            placeholder="Select Worker"
            value={selectedWorker}
            onChange={setSelectedWorker}
          >
            {workers.map((w) => (
              <Option key={w.employee.id} value={w.employee.id}>
                {w.employee.fullName}
              </Option>
            ))}
          </Select>
        </div>

        {/* Available Tasks */}
        <Divider orientation="left">Available Tasks</Divider>
        <Checkbox.Group
          className="flex flex-col gap-2 mb-4"
          value={selectedTasks}
          onChange={setSelectedTasks}
        >
          {tasks.map((t) => (
            <Checkbox key={t.id} value={t.id}>
              {t.taskName}
            </Checkbox>
          ))}
        </Checkbox.Group>

        {/* Execution Order */}
        {selectedTasks.length > 0 && (
          <div className="mb-4">
            <Divider orientation="left">Execution Order (optional)</Divider>
            <ol className="list-decimal pl-6">
              {selectedTasks.map((taskId, idx) => {
                const task = tasks.find((t) => t.id === taskId);
                return <li key={taskId}>{task?.taskName}</li>;
              })}
            </ol>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-4">
          <Button onClick={() => setSelectedTasks([])}>Cancel</Button>
          <Button type="primary" onClick={assignTasks}>
            Assign Tasks
          </Button>
        </div>

        {/* Assigned Tasks */}
        <Divider />
        <h4 className="font-semibold mb-3">Assigned Tasks</h4>
        <Spin spinning={loading}>
          {assignedTasks.length === 0 ? (
            <div className="text-gray-400">No tasks assigned</div>
          ) : (
            assignedTasks.map((t) => (
              <div
                key={t.assignmentId}
                className="flex justify-between items-center border rounded px-3 py-2 mb-2"
              >
                <div>
                  <strong>
                    {t.sequence}. {t.taskName}
                  </strong>
                  <div className="text-sm text-gray-500">
                    {t.status === "queued" && "🕒 Queued"}
                    {t.status === "in_progress" && "⏳ In Progress"}
                    {t.status === "completed" && "✅ Completed"}
                  </div>
                </div>
                {t.status === "queued" && (
                  <div className="flex gap-2">
                    <Button size="small" onClick={() => openEditModal(t)}>
                      ✏ Edit
                    </Button>
                    <Button
                      size="small"
                      danger
                      onClick={() => removeQueuedTask(t.assignmentId)}
                    >
                      🗑 Delete
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </Spin>
      </div>

      {/* Edit Task Modal */}
      <Modal
        title="Edit Queued Task"
        open={editModal}
        onCancel={() => setEditModal(false)}
        onOk={saveEdit}
      >
        <Select
          className="w-full"
          value={editedTask?.taskId}
          onChange={(val) =>
            setEditedTask({ ...editedTask, taskId: val })
          }
        >
          {tasks.map((t) => (
            <Option key={t.id} value={t.id}>
              {t.taskName}
            </Option>
          ))}
        </Select>
      </Modal>
    </div>
  );
}
