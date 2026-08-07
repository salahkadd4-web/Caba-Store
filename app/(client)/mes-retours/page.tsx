import ClientRetourView from '@/components/retours/ClientRetourView'

export const dynamic = 'force-dynamic'

export default async function MesRetoursPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>
}) {
  const { orderId } = await searchParams
  return <ClientRetourView orderId={orderId ?? ''} />
}
