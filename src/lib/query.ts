
import { redirect } from "next/navigation";
import { getAuthSession } from "./auth";
import prisma from "./db";


export default async function  GetProject(){
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/login");
  }
  const projects = await prisma.webAnalysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return projects;
}