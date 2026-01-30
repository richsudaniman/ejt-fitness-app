/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminAnalytics from './pages/AdminAnalytics';
import AdminAnnouncements from './pages/AdminAnnouncements';
import AdminClientAssignments from './pages/AdminClientAssignments';
import AdminDashboard from './pages/AdminDashboard';
import AdminEducationalContent from './pages/AdminEducationalContent';
import AdminInviteUser from './pages/AdminInviteUser';
import AdminTrainers from './pages/AdminTrainers';
import AdminUsers from './pages/AdminUsers';
import AdminVideos from './pages/AdminVideos';
import DiagnosticTool from './pages/DiagnosticTool';
import Home from './pages/Home';
import Learn from './pages/Learn';
import Messages from './pages/Messages';
import Nutrition from './pages/Nutrition';
import Progress from './pages/Progress';
import SwitchRole from './pages/SwitchRole';
import TrainerAssignClients from './pages/TrainerAssignClients';
import TrainerClientDetail from './pages/TrainerClientDetail';
import TrainerClients from './pages/TrainerClients';
import TrainerDashboard from './pages/TrainerDashboard';
import TrainerMessages from './pages/TrainerMessages';
import TrainerProfile from './pages/TrainerProfile';
import TrainerVideos from './pages/TrainerVideos';
import Workout from './pages/Workout';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminAnalytics": AdminAnalytics,
    "AdminAnnouncements": AdminAnnouncements,
    "AdminClientAssignments": AdminClientAssignments,
    "AdminDashboard": AdminDashboard,
    "AdminEducationalContent": AdminEducationalContent,
    "AdminInviteUser": AdminInviteUser,
    "AdminTrainers": AdminTrainers,
    "AdminUsers": AdminUsers,
    "AdminVideos": AdminVideos,
    "DiagnosticTool": DiagnosticTool,
    "Home": Home,
    "Learn": Learn,
    "Messages": Messages,
    "Nutrition": Nutrition,
    "Progress": Progress,
    "SwitchRole": SwitchRole,
    "TrainerAssignClients": TrainerAssignClients,
    "TrainerClientDetail": TrainerClientDetail,
    "TrainerClients": TrainerClients,
    "TrainerDashboard": TrainerDashboard,
    "TrainerMessages": TrainerMessages,
    "TrainerProfile": TrainerProfile,
    "TrainerVideos": TrainerVideos,
    "Workout": Workout,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};