import Head from 'next/head';
import Workspace from '../components/workspace/Workspace';
import ApplicantSignIn from '../components/auth/ApplicantSignIn';
import { readSession } from '../lib/auth';
import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async context => {
  if (process.env.NODE_ENV === 'production' && !readSession(context.req as never)) return { props: { authenticated: false } };
  return { props: { authenticated: true } };
};

export default function DashboardPage({ authenticated }: { authenticated: boolean }) {
  return <><Head><title>Project workspace | Arthix</title><meta name="description" content="Arthix industrial approvals and compliance workspace for Maharashtra." /></Head>{authenticated ? <Workspace /> : <ApplicantSignIn />}</>;
}
