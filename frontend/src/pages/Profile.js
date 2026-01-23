import React from "react";
import { Container, Paper, Typography, Grid, Chip } from "@mui/material";
import { useAuth } from "../context/AuthContext";

const Profile = () => {
  const { user } = useAuth();

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>
      <Paper sx={{ p: 4, mt: 3 }}>
        <Grid container spacing={3}>
          <Grid size={12}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Username
            </Typography>
            <Typography variant="body1" sx={{ fontSize: "1.1rem" }}>
              {user?.username}
            </Typography>
          </Grid>
          <Grid size={12}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Email
            </Typography>
            <Typography variant="body1" sx={{ fontSize: "1.1rem" }}>
              {user?.email}
            </Typography>
          </Grid>
          <Grid size={12}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Role
            </Typography>
            <Chip
              label={user?.role?.toUpperCase()}
              color={user?.role === "admin" ? "primary" : "default"}
              sx={{ fontSize: "0.9rem", fontWeight: "bold" }}
            />
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Profile;
