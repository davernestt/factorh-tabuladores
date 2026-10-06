import Participant360 from './participant-360';
export default async function AnonymousFeedbackPage({params}:{params:Promise<{token:string}>}) {
  const {token}=await params;
  return <Participant360 token={token} />;
}
