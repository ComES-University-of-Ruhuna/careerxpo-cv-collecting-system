import { Redirect } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import Loader from '../src/components/Loader';

// Root entry point. Wait for the auth bootstrap to finish, then route the
// user to the tabs (if signed in) or the login screen.
export default function Index() {
  const { loading, token, user } = useAuth();

  if (loading) return <Loader />;
  if (token && user) return <Redirect href="/(tabs)/dashboard" />;
  return <Redirect href="/login" />;
}
