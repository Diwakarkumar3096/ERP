import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { initDatabase, getPhase3Error, getPhase4Error, getPhase5Error, getPhase6Error, getPhase7Error, getPhase8Error, getPhase9Error, getPhase10Error, getPhase11Error, getPhase12Error, getPhase13Error, getPhase14Error, getPhase15Error, getPhase21Error, getPhase23Error } from './server/db.js';
import { authenticateToken } from './server/auth.js';

import authRouter from './server/routes/auth.js';
import schoolsRouter from './server/routes/schools.js';
import sessionsRouter from './server/routes/sessions.js';
import classesRouter from './server/routes/classes.js';
import sectionsRouter from './server/routes/sections.js';
import usersRouter from './server/routes/users.js';
import rolesRouter from './server/routes/roles.js';
import auditRouter from './server/routes/audit.js';
import dashboardRouter from './server/routes/dashboard.js';
import studentsRouter from './server/routes/students.js';
import parentsRouter from './server/routes/parents.js';
import admissionsRouter from './server/routes/admissions.js';
import employeesRouter from './server/routes/employees.js';
import attendanceRouter from './server/routes/attendance.js';
import feesRouter from './server/routes/fees.js';
import examsRouter from './server/routes/exams.js';
import classroomRouter from './server/routes/classroom.js';
import transportRouter from './server/routes/transport.js';
import libraryRouter from './server/routes/library.js';
import hostelRouter from './server/routes/hostel.js';
import payrollRouter from './server/routes/payroll.js';
import inventoryRouter from './server/routes/inventory.js';
import communicationRouter from './server/routes/communication.js';
import administrationRouter from './server/routes/administration.js';
import misRouter from './server/routes/mis.js';
import lifecycleRouter from './server/routes/lifecycle.js';
import portalRouter from './server/routes/portal.js';
import academicRouter from './server/routes/academic.js';
import workflowRouter from './server/routes/workflow.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '20mb' }));
app.use(cookieParser());
app.use(authenticateToken);

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/schools', schoolsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/classes', classesRouter);
app.use('/api/sections', sectionsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/parents', parentsRouter);
app.use('/api/admissions', admissionsRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/fees', feesRouter);
app.use('/api/exams', examsRouter);
app.use('/api/classroom', classroomRouter);
app.use('/api/transport', transportRouter);
app.use('/api/library', libraryRouter);
app.use('/api/hostel', hostelRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/communication', communicationRouter);
app.use('/api/administration', administrationRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/mis', misRouter);
app.use('/api/lifecycle', lifecycleRouter);
app.use('/api/portal', portalRouter);
app.use('/api/academic', academicRouter);
app.use('/api/workflow', workflowRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'School ERP Management System',
    phase: 23,
    phase3Error: getPhase3Error(),
    phase4Error: getPhase4Error(),
    phase5Error: getPhase5Error(),
    phase6Error: getPhase6Error(),
    phase7Error: getPhase7Error(),
    phase8Error: getPhase8Error(),
    phase9Error: getPhase9Error(),
    phase10Error: getPhase10Error(),
    phase11Error: getPhase11Error(),
    phase12Error: getPhase12Error(),
    phase13Error: getPhase13Error(),
    phase14Error: getPhase14Error(),
    phase15Error: getPhase15Error(),
    phase21Error: getPhase21Error(),
    phase23Error: getPhase23Error(),
    timestamp: new Date().toISOString()
  });
});

// Download full project source zip archive
app.get('/api/download-zip', (req, res) => {
  const zipPath = path.join(__dirname, 'school-erp-project.zip');
  res.download(zipPath, 'school-erp-project.zip');
});

async function startServer() {
  // Initialize Database & seed if necessary
  await initDatabase();

  const httpServer = http.createServer(app);

  if (!isProd) {
    // Development mode with Vite dev middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer
        }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve static files from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[School ERP] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SERVER STARTUP ERROR]', err);
  process.exit(1);
});
