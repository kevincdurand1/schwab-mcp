#!/usr/bin/env node
import 'dotenv/config';
import { spawn } from 'child_process';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
const app = express();
app.use(express.json());
const sessions = new Map();
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
// Clean up inactive sessions
setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
        if (now - session.lastActivity > SESSION_TIMEOUT) {
            console.log(`Cleaning up inactive session: ${id}`);
            session.process.kill();
            sessions.delete(id);
        }
    }
}, 60000); // Check every minute
// Create a new MCP session
app.post('/mcp/sessions', (req, res) => {
    const sessionId = uuidv4();
    const mcp = spawn('npx', ['tsx', 'src/mcp-server.ts'], {
        cwd: process.cwd()
    });
    sessions.set(sessionId, {
        process: mcp,
        lastActivity: Date.now()
    });
    // Handle process errors
    mcp.on('error', (error) => {
        console.error(`Session ${sessionId} error:`, error);
        sessions.delete(sessionId);
    });
    mcp.on('exit', (code) => {
        console.log(`Session ${sessionId} exited with code ${code}`);
        sessions.delete(sessionId);
    });
    res.json({ sessionId });
});
// Send request to MCP server
app.post('/mcp/sessions/:sessionId/request', async (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    session.lastActivity = Date.now();
    try {
        // Send request to MCP process
        session.process.stdin.write(JSON.stringify(req.body) + '\n');
        // Wait for response
        const response = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for MCP response'));
            }, 30000); // 30 second timeout
            session.process.stdout.once('data', (data) => {
                clearTimeout(timeout);
                try {
                    // Parse each line as a separate JSON object
                    const lines = data.toString().split('\n').filter((line) => line.trim());
                    const responses = lines.map((line) => {
                        try {
                            return JSON.parse(line);
                        }
                        catch {
                            return null;
                        }
                    }).filter(Boolean);
                    // Return the last valid response
                    resolve(responses[responses.length - 1]);
                }
                catch (error) {
                    reject(error);
                }
            });
            session.process.stderr.once('data', (data) => {
                console.error(`Session ${sessionId} stderr:`, data.toString());
            });
        });
        res.json(response);
    }
    catch (error) {
        console.error(`Error processing request for session ${sessionId}:`, error);
        res.status(500).json({
            error: 'Failed to process request',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Delete a session
app.delete('/mcp/sessions/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    session.process.kill();
    sessions.delete(sessionId);
    res.json({ message: 'Session terminated' });
});
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        activeSessions: sessions.size
    });
});
const PORT = process.env.MCP_BRIDGE_PORT || 8080;
app.listen(PORT, () => {
    console.log(`MCP HTTP Bridge running on port ${PORT}`);
    console.log(`Create session: POST http://localhost:${PORT}/mcp/sessions`);
    console.log(`Send request: POST http://localhost:${PORT}/mcp/sessions/{sessionId}/request`);
});
//# sourceMappingURL=mcp-http-bridge.js.map