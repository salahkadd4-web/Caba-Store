import { prisma } from '@/lib/prisma'

export const profileOtpKey = (userId: string) => `otp_profil_${userId}`

export async function verifyAndConsumeProfileOtp(userId: string, otp: string): Promise<boolean> {
  const record = await prisma.otpToken.findFirst({
    where: { identifiant: profileOtpKey(userId), expiresAt: { gt: new Date() } },
  })
  if (!record || record.token !== otp) return false
  await prisma.otpToken.delete({ where: { id: record.id } })
  return true
}
