import { useEffect, useState } from "react";
import {
  Select,
  Card,
  InputNumber,
  Input,
  Button,
  Image,
  message,
  Spin,
  Tag
} from "antd";
import api from "../../utils/api";

const { TextArea } = Input;
const { Option } = Select;

export default function WorkerTaskReviewToday() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);

  /* -------------------------------
     Load supervisor projects
  ------------------------------- */
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await api.get("/api/supervisor/projects");
        const projArray = res.data.data || [];
        setProjects(projArray);

        // Auto-load first project submissions
        if (projArray.length > 0) {
          const firstProjectId = projArray[0].id;
          setProjectId(firstProjectId);
          loadSubmissions(firstProjectId);
        }
      } catch (err) {
        console.error(err);
        message.error("Failed to load projects");
      }
    };

    loadProjects();
  }, []);

  /* -------------------------------
     Load worker submissions
  ------------------------------- */
  const loadSubmissions = async (pid) => {
    setLoading(true);
    try {
      const res = await api.get(
        `/api/supervisor/projects/${pid}/worker-submissions/today`
      );

      setSubmissions(
        res.data.map(item => ({
          ...item,
          approvedPercent: item.progressPercent
        }))
      );
    } catch (err) {
      console.error(err);
      message.error("Failed to load submissions");
      setSubmissions([]);
    }
    setLoading(false);
  };

  /* -------------------------------
     Approve / Reject worker progress
  ------------------------------- */
  const reviewProgress = async (item, status) => {
    try {
      await api.patch(
        `/api/supervisor/worker-progress/${item.progressId}/review`,
        {
          status,
          approvedPercent: item.approvedPercent,
          remarks: item.remarks
        }
      );
      message.success(`Submission ${status.toLowerCase()}`);
      loadSubmissions(projectId); // reload submissions after review
    } catch (err) {
      console.error(err);
      message.error("Review failed");
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-lg font-semibold">Worker Task Review (Today)</h1>

      {/* Project Selector */}
      <Select
        placeholder="Select Project"
        className="w-full"
        value={projectId}
        onChange={(value) => {
          setProjectId(value);
          loadSubmissions(value);
        }}
      >
        {projects.map(p => (
          <Option key={p.id} value={p.id}>
            {p.projectName}
          </Option>
        ))}
      </Select>

      {loading && <Spin className="block mx-auto" />}

      {/* Submissions */}
      {submissions.map(item => (
        <Card key={item.progressId} className="shadow-sm">
          <div className="flex justify-between">
            <div>
              <p className="font-medium">{item.workerName}</p>
              <p className="text-xs text-gray-500">{item.taskName}</p>
            </div>
            <Tag
              color={
                item.status === "APPROVED"
                  ? "green"
                  : item.status === "REJECTED"
                  ? "red"
                  : "orange"
              }
            >
              {item.status}
            </Tag>
          </div>

          <p className="text-sm mt-2">
            Attendance: {item.attendanceChecked ? "✔ Checked In" : "❌ Not Checked In"}
          </p>

          <p className="text-sm mt-1">Worker Progress: {item.progressPercent}%</p>

          <p className="text-sm mt-2 font-medium">Work Description</p>
          <p className="text-sm">{item.description}</p>

          {/* Photos */}
          <div className="flex gap-2 mt-2">
            {item.photos.map((p, i) => (
              <Image key={i} src={p.photoUrl} width={70} height={70} />
            ))}
          </div>

          {/* Review Section */}
          {item.status === "SUBMITTED" && (
            <>
              <div className="mt-3">
                <span className="text-xs">Approved Progress (%)</span>
                <InputNumber
                  min={0}
                  max={item.progressPercent}
                  value={item.approvedPercent}
                  onChange={(v) =>
                    setSubmissions(prev =>
                      prev.map(s =>
                        s.progressId === item.progressId
                          ? { ...s, approvedPercent: v }
                          : s
                      )
                    )
                  }
                  className="w-full"
                />
              </div>

              <TextArea
                rows={2}
                placeholder="Supervisor remarks"
                className="mt-2"
                onChange={(e) =>
                  setSubmissions(prev =>
                    prev.map(s =>
                      s.progressId === item.progressId
                        ? { ...s, remarks: e.target.value }
                        : s
                    )
                  )
                }
              />

              <div className="flex gap-2 mt-3">
                <Button
                  type="primary"
                  block
                  onClick={() => reviewProgress(item, "APPROVED")}
                  disabled={!item.attendanceChecked}
                >
                  Approve
                </Button>

                <Button
                  danger
                  block
                  onClick={() => reviewProgress(item, "REJECTED")}
                  disabled={!item.remarks}
                >
                  Reject
                </Button>
              </div>
            </>
          )}
        </Card>
      ))}
    </div>
  );
}
