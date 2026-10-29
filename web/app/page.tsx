import { rewrite } from "next/navigation";

export default function HomePage() {
  rewrite("/home.html");
}
