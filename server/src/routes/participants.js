const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Get participants for a session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await db.query(
      'SELECT * FROM workshop_participants WHERE session_id = $1 ORDER BY name',
      [sessionId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

// Add participant to a session
router.post('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { name, role, company, email } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await db.query(
      `INSERT INTO workshop_participants (session_id, name, role, company, email, is_present)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [sessionId, name, role || null, company || null, email || null]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding participant:', error);
    res.status(500).json({ error: 'Failed to add participant' });
  }
});

// Add multiple participants at once
router.post('/session/:sessionId/bulk', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { participants } = req.body;

    if (!participants || !Array.isArray(participants)) {
      return res.status(400).json({ error: 'Participants array is required' });
    }

    const results = [];
    for (const p of participants) {
      if (p.name) {
        const result = await db.query(
          `INSERT INTO workshop_participants (session_id, name, role, company, email, is_present)
           VALUES ($1, $2, $3, $4, $5, true)
           RETURNING *`,
          [sessionId, p.name, p.role || null, p.company || null, p.email || null]
        );
        results.push(result.rows[0]);
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error adding participants:', error);
    res.status(500).json({ error: 'Failed to add participants' });
  }
});

// Update participant
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, company, email, is_present } = req.body;

    const result = await db.query(
      `UPDATE workshop_participants
       SET name = COALESCE($1, name),
           role = COALESCE($2, role),
           company = COALESCE($3, company),
           email = COALESCE($4, email),
           is_present = COALESCE($5, is_present)
       WHERE id = $6
       RETURNING *`,
      [name, role, company, email, is_present, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating participant:', error);
    res.status(500).json({ error: 'Failed to update participant' });
  }
});

// Delete participant
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM workshop_participants WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting participant:', error);
    res.status(500).json({ error: 'Failed to delete participant' });
  }
});

// Toggle participant presence
router.patch('/:id/presence', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_present } = req.body;

    const result = await db.query(
      'UPDATE workshop_participants SET is_present = $1 WHERE id = $2 RETURNING *',
      [is_present, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating presence:', error);
    res.status(500).json({ error: 'Failed to update presence' });
  }
});

module.exports = router;
