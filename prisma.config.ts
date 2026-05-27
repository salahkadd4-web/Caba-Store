import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  datasource: {
    url: env('DIRECT_URL'),  // URL directe, sans pooler → pour db push / migrate
  },
})