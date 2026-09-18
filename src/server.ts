import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.PORT, () => {
  console.log(`Lagos Property Listings API listening on port ${env.PORT}`);
});
