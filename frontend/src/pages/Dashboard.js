import Layout from '../components/Layout';
import CalendarView from '../components/CalendarView';

const Dashboard = () => {
  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
      <p className="mb-4">Use the navigation above to manage assets and campaign bookings.</p>
      <CalendarView />
    </Layout>
  );
};

export default Dashboard;