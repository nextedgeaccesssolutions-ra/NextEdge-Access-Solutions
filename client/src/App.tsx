import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import StoreBooking from "./pages/StoreBooking";
import CmsPage from "./pages/CmsPage";
import GitHubConnector from "./pages/GitHubConnector";

function Router() {
  return <Switch><Route path="/" component={Home}/><Route path="/store" component={StoreBooking}/><Route path="/store-booking" component={StoreBooking}/><Route path="/admin" component={Admin}/><Route path="/github-connector" component={GitHubConnector}/><Route path="/page/:slug" component={CmsPage}/><Route path="/404" component={NotFound}/><Route component={NotFound}/></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster/><Router/></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
