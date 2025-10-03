import {createBrowserRouter} from "react-router-dom";
import AdminDashboard from "../pages/AdminDashboardPage";
import LoginPage from "../pages/LoginPage";
export const router=createBrowserRouter([{path:"/login",element:<LoginPage/>},{path:"/admin",element:<AdminDashboard/>}]);