require('dotenv').config();

const app = require('./app');
const cron = require('./cron');

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Sweet Dreams RV backend listening on port ${port}`);
});

cron.start();
