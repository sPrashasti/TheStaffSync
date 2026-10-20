import AuthLanding from './landing/AuthLanding';
import SignupForm from './SignupForm';

// The sign-up page: the landing with the sign-up form beside the pitch.
function SignupPage() {
  return <AuthLanding card={<SignupForm autoFocus />} mode="signup" />;
}

export default SignupPage;
