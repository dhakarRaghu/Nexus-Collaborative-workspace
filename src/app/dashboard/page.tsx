// "use client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Make sure authOptions is correctly configured
import { redirect } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

const DashboardPage = async () => {
  // Fetching session server-side
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return redirect("/login"); // Redirect to login if no user session
  }

  return (
    <div>
      <h1>Dashboard</h1>
      {/* <button onClick={() => { signOut()}}>
        Sign out
        <LogOut className="w-4 h-4 ml-2" />
      </button> */}
    </div>
  );
};

export default DashboardPage;
