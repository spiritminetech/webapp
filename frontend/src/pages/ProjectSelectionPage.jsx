import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProjects } from "../api/attendanceApi";
import { Button, Card, Radio, Spin } from "antd";

export default function ProjectSelection() {
  const { user, selectProject } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  console.log("ProjectSelection: Component mounted");
  console.log("ProjectSelection: User:", user);

  useEffect(() => {
    console.log("ProjectSelection: useEffect triggered");
    
    const fetchProjects = async () => {
      try {
        console.log("ProjectSelection: Fetching projects for user:", user);
        const res = await getProjects(user.employeeId);
        console.log("ProjectSelection: Projects response:", res);
        setProjects(res.data.projects || []);
      } catch (err) {
        console.error("ProjectSelection: Error fetching projects:", err);
      } finally {
        console.log("ProjectSelection: Finished loading projects");
        setLoading(false);
      }
    };
    
    if (user?.employeeId) {
      fetchProjects();
    } else {
      console.log("ProjectSelection: No user or employeeId, stopping loading");
      setLoading(false);
    }
  }, [user]);

  const handleContinue = () => {
    if (selectedProject) {
      console.log("ProjectSelection: Selecting project", selectedProject);
      selectProject(selectedProject);
      console.log("ProjectSelection: Navigating to /worker/tasks");
      navigate("/worker/tasks");
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100">
      <Card title="Select Your Project" className="w-full max-w-md">
        {loading ? (
          <div className="text-center"><Spin /></div>
        ) : (
          <>
            <Radio.Group
              className="flex flex-col space-y-3"
              onChange={(e) => setSelectedProject(e.target.value)}
              value={selectedProject}
            >
              {projects && projects.map((proj) => (
                <Radio key={proj.id} value={proj}>
                  {proj.projectName}
                </Radio>
              ))}
            </Radio.Group>
            <div className="flex justify-end mt-4">
              <Button type="primary" onClick={handleContinue} disabled={!selectedProject}>
                Continue
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}


