import { useEffect, useState } from "react";
import {
  Select,
  Card,
  Progress,
  Input,
  Upload,
  Button,
  message,
  Spin,
  Empty
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import api from "../../utils/api";

const { Option } = Select;
const { TextArea } = Input;

export default function SupervisorDailyProgress() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(null);
  const [approvedTasks, setApprovedTasks] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [issues, setIssues] = useState("");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ----------------------------------------
     Load supervisor projects
  ---------------------------------------- */
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await api.get("/api/supervisor/projects");
        setProjects(res.data?.data || []);
      } catch {
        message.error("Failed to load projects");
      }
    };
    loadProjects();
  }, []);

  /* ----------------------------------------
     Load approved worker progress (TODAY)
  ---------------------------------------- */
  const loadApprovedProgress = async (pid) => {
    setLoading(true);
    try {
      const res = await api.get(
        `/api/supervisor/projects/${pid}/worker-submissions/today`
      );

      const approved = res.data.filter(
        p => p.status === "APPROVED"
      );

      setApprovedTasks(approved);
    } catch {
      message.error("Failed to load approved worker progress");
      setApprovedTasks([]);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------
     Calculate overall progress (DISPLAY ONLY)
  ---------------------------------------- */
  const overallProgress =
    approvedTasks.length > 0
      ? Math.round(
          approvedTasks.reduce(
            (sum, t) => sum + t.progressPercent,
            0
          ) / approvedTasks.length
        )
      : 0;

  /* ----------------------------------------
     Submit daily progress
  ---------------------------------------- */
  const submitDailyProgress = async () => {
    if (!projectId) return;

    setSubmitting(true);
    try {
      const res = await api.post(
        "/api/supervisor/daily-progress",
        {
          projectId,
          remarks,
          issues
        }
      );

      const { dailyProgressId } = res.data;

      if (photos.length) {
        const formData = new FormData();
        formData.append("projectId", projectId);
        formData.append("dailyProgressId", dailyProgressId);

        photos.forEach(p =>
          formData.append("photos", p.originFileObj)
        );

        await api.post(
          "/api/supervisor/daily-progress/photos",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" }
          }
        );
      }

      message.success("Daily progress submitted successfully");

      // Reset UI
      setRemarks("");
      setIssues("");
      setPhotos([]);
      setApprovedTasks([]);
    } catch (err) {
      message.error(
        err.response?.data?.message || "Submission failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-lg font-semibold">
        Supervisor Daily Progress
      </h1>

      {/* Project Selector */}
      <Select
        placeholder="Select Project"
        className="w-full"
        value={projectId}
        onChange={(value) => {
          setProjectId(value);
          loadApprovedProgress(value);
        }}
      >
        {projects.map(p => (
          <Option key={p.id} value={p.id}>
            {p.projectName}
          </Option>
        ))}
      </Select>

      {loading && <Spin className="block mx-auto" />}

      {/* Approved Worker Progress */}
      {!loading && projectId && approvedTasks.length === 0 && (
        <Empty description="No approved worker progress today" />
      )}

      {approvedTasks.map(item => (
        <Card key={item.progressId} size="small">
          <p className="font-medium">{item.workerName}</p>
          <p className="text-xs text-gray-500">
            {item.taskName}
          </p>
          <Progress
            percent={item.progressPercent}
            size="small"
          />
        </Card>
      ))}

      {/* Overall Progress */}
      {approvedTasks.length > 0 && (
        <Card className="bg-gray-50">
          <p className="font-medium mb-1">
            Overall Project Progress
          </p>
          <Progress percent={overallProgress} />
        </Card>
      )}

      {/* Supervisor Remarks */}
      <TextArea
        rows={3}
        placeholder="Supervisor remarks"
        value={remarks}
        onChange={e => setRemarks(e.target.value)}
      />

      {/* Issues */}
      <TextArea
        rows={3}
        placeholder="Issues / Blockers"
        value={issues}
        onChange={e => setIssues(e.target.value)}
      />

      {/* Site Photos */}
      <Upload
        listType="picture"
        beforeUpload={() => false}
        fileList={photos}
        onChange={({ fileList }) => setPhotos(fileList)}
      >
        <Button icon={<UploadOutlined />}>
          Upload Site Photos
        </Button>
      </Upload>

      {/* Submit */}
      <Button
        type="primary"
        block
        size="large"
        onClick={submitDailyProgress}
        disabled={!projectId || !approvedTasks.length}
        loading={submitting}
      >
        Submit Daily Progress
      </Button>
    </div>
  );
}
