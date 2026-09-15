import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import scheduleRoutes from "./routes/scheduleRoutes.js";
import weatherRoutes from "./routes/weatherRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import userRouter from "./routes/userRouter.js";
import machineryRoutes from "./routes/machineryRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import testTemplateRoutes from "./routes/testTemplateRoutes.js";
import testSchemaRoutes from "./routes/testSchemaRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import resourceRoutes from "./routes/resourceRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

import labourRouter from "./routes/labourRouter.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "FMRC backend is running." });
});

app.use('/api/users', userRouter);
app.use('/api/machinery', machineryRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/test-templates', testTemplateRoutes);
app.use('/api/test-schema', testSchemaRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use('/api/labours', labourRouter);

// Fallback error handler so unexpected exceptions return JSON instead of crashing silently.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Unexpected server error.", error: err.message });
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
