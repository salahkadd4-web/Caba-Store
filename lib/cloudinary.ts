import { v2 as cloudinary } from 'cloudinary'
import { lireCloudName } from '@/lib/cloudinary-account'

cloudinary.config({
  cloud_name: lireCloudName(), // nettoyé (trim), cf. lib/cloudinary-account.ts
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export default cloudinary
