import { useState, useCallback, useEffect } from "react";
import { Box, Button, Alert, Tabs, Tab } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { schedulerAPI, systemAPI } from "../api/api";
import { handleApiError } from "../utils/errorHandler";
import PageContainer from "../components/PageContainer";
import LoadingSpinner from "../components/LoadingSpinner";
import SchedulerList from "../components/SchedulerList";
import SchedulerForm from "../components/SchedulerForm";

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const Scheduler = () => {
  const [schedulers, setSchedulers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [editingScheduler, setEditingScheduler] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
  });

  const fetchSchedulers = useCallback(async (limit = 50, offset = 0) => {
    try {
      setLoading(true);
      const [schedulersRes, configRes] = await Promise.all([
        schedulerAPI.getAll(limit, offset),
        systemAPI.getConfig(),
      ]);
      const data = schedulersRes.data.data;
      setSchedulers(data);
      setPagination(schedulersRes.data.pagination);
      setError("");

      const emailDisabled = configRes.data.EMAIL_ENABLED !== "true";
      const hasSendReport = data.some(
        (s) => s.type === "send_report" && s.enabled === 1,
      );
      if (emailDisabled && hasSendReport) {
        setWarning(
          "Email is disabled (EMAIL_ENABLED=false). Send Report schedulers will run but no emails will be sent.",
        );
      } else {
        setWarning((prev) =>
          prev.startsWith("Email is disabled") ? "" : prev,
        );
      }
    } catch (err) {
      handleApiError(err, "Failed to fetch schedulers", (msg) => setError(msg));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedulers();
  }, [fetchSchedulers]);

  const handleTabChange = (_event, newValue) => {
    setTabValue(newValue);
    if (newValue === 0) {
      // Reset editing when switching to list tab
      setEditingScheduler(null);
    }
  };

  const handleCreateClick = () => {
    setEditingScheduler(null);
    setTabValue(1); // Switch to form tab
  };

  const handleFormSubmit = async (formData) => {
    try {
      let response;
      if (editingScheduler) {
        response = await schedulerAPI.update(editingScheduler.id, {
          ...formData,
          enabled: editingScheduler.enabled,
        });
        setSuccess("Scheduler updated successfully");
      } else {
        response = await schedulerAPI.create(formData);
        setSuccess("Scheduler created successfully");
      }

      setWarning(response.data.warning || "");
      setTabValue(0); // Switch back to list
      fetchSchedulers();
      setEditingScheduler(null);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      handleApiError(err, "Failed to save scheduler");
    }
  };

  const handleEdit = (scheduler) => {
    setEditingScheduler(scheduler);
    setTabValue(1); // Switch to form tab
  };

  const handleDelete = async (schedulerId) => {
    if (!window.confirm("Are you sure you want to delete this scheduler?")) {
      return;
    }

    try {
      await schedulerAPI.delete(schedulerId);
      setSuccess("Scheduler deleted successfully");
      fetchSchedulers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      handleApiError(err, "Failed to delete scheduler");
    }
  };

  const handleFormCancel = () => {
    setEditingScheduler(null);
    setTabValue(0);
  };

  return (
    <PageContainer>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      {warning && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {warning}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Schedulers" />
          <Tab
            label={editingScheduler ? "Edit Scheduler" : "Create Scheduler"}
          />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={handleCreateClick}
          >
            New Scheduler
          </Button>
        </Box>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <SchedulerList
            schedulers={schedulers}
            pagination={pagination}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPageChange={fetchSchedulers}
            onWarning={setWarning}
          />
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <SchedulerForm
          scheduler={editingScheduler}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      </TabPanel>
    </PageContainer>
  );
};

export default Scheduler;
