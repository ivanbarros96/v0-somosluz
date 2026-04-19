import { AuthProvider } from '@/lib/auth-context';
import { MembersProvider } from '@/lib/members-store';

export default function IntranetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <MembersProvider>
        {children}
      </MembersProvider>
    </AuthProvider>
  );
}
