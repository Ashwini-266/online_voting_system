const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'ash@123', 
  database: 'online_voting_system'
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to MySQL database');
  }
});

// API to handle voting
app.post('/vote', (req, res) => {
  const { username, candidate_id } = req.body;

  if (!Number.isInteger(candidate_id)) {
    return res.status(400).json({ message: 'Invalid candidate ID format' });
  }

  const checkVoteQuery = `
    SELECT * FROM votes WHERE user_id = (SELECT id FROM users WHERE username = ?) LIMIT 1
  `;

  db.query(checkVoteQuery, [username], (err, results) => {
    if (err) {
      console.error("SQL Error:", err);
      return res.status(500).json({ message: 'Database error', error: err.sqlMessage });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: 'You have already voted!' });
    }

    const voteQuery = `
      INSERT INTO votes (user_id, candidate_id)
      VALUES ((SELECT id FROM users WHERE username = ? LIMIT 1), ?)
    `;

    db.query(voteQuery, [username, candidate_id], (err, results) => {
      if (err) {
        console.error("SQL Error:", err);
        return res.status(500).json({ message: 'Error recording vote', error: err.sqlMessage });
      }
      res.json({ message: 'Vote recorded successfully!' });
    });
  });
});

// API to get voting results
app.get('/results', (req, res) => {
  const resultsQuery = `
    SELECT candidates.name, COUNT(votes.id) AS vote_count 
    FROM candidates 
    LEFT JOIN votes ON candidates.id = votes.candidate_id 
    GROUP BY candidates.id
  `;

  db.query(resultsQuery, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching results' });
    }
    res.json(results);
  });
});

// API to fetch vote count per candidate
app.get('/vote-count', (req, res) => {
  const countQuery = `
    SELECT candidate_id, COUNT(*) AS total_votes 
    FROM votes 
    GROUP BY candidate_id 
    ORDER BY total_votes DESC
  `;

  db.query(countQuery, (err, results) => {
    if (err) {
      console.error("Error fetching vote count:", err);
      return res.status(500).json({ message: 'Error fetching vote count' });
    }
    res.json(results);
  });
});

// API to clear all votes
app.delete('/clear-votes', (req, res) => {
  db.query('DELETE FROM votes', (err) => {
    if (err) {
      console.error('Error deleting votes:', err);
      return res.status(500).json({ message: 'Error clearing votes' });
    }

    db.query('ALTER TABLE votes AUTO_INCREMENT = 1', (err) => {
      if (err) {
        console.error('Error resetting auto-increment:', err);
        return res.status(500).json({ message: 'Votes cleared, but ID reset failed' });
      }

      res.json({ message: 'All votes cleared, and ID reset successfully!' });
    });
  });
});

// Start server
app.listen(5000, () => {
  console.log('Server running on port 5000');
});
