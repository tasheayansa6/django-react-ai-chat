import React, { useContext } from "react";
import { Link } from "react-router-dom";
import AuthContext from "../context/AuthContext";

import "../styles/LoginPage.scss";

const LoginPage = () => {
  const { loginUser } = useContext(AuthContext);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // ✅ prevent reload
    loginUser(e);
  };

  return (
    <div id="login">
      <Link id="register" to="/register">
        Register
      </Link>

      <form onSubmit={handleSubmit}>
        <h2>Login</h2>

        <input
          type="text"
          name="username"
          placeholder="Enter Username"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Enter Password"
          required
        />

        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default LoginPage;
