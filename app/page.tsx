import { Portfolio } from "@/components/portfolio";
import { todayIn } from "@/lib/dates";
import { getStudioContent } from "@/lib/server/studio";
import "./portfolio.css";
import "./camera.css";
import "./story-motion.css";
import "./camera-mode-dial.css";
import "./viewfinder.css";

export default async function Home() {
  const content = await getStudioContent();
  return <Portfolio content={content} earliestDate={todayIn(process.env.STUDIO_TIMEZONE)} />;
}
