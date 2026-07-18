import DriverDashboard from './DriverDashboard';

export default function DriverPage({ params }: { params: { id: string } }) {
  return <DriverDashboard ambulanceId={params.id} />;
}
