import React, { useState, useEffect } from "react";
import "../styles/PaymentSuccess.css";
import { useLocation, useNavigate } from "react-router-dom";
import { backendUrl } from "../App";
import axios from "axios";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import logo from "../assets/logo.jpeg";
const PaymentFailure = () => {
  const query = new URLSearchParams(useLocation().search);
  const payment_id = query.get("reference");

  const navigate = useNavigate();

  useEffect(() => {
    // Optional: Redirect after 10 seconds
    setTimeout(() => {
      navigate("/home");
    }, 10000);
  }, []);

  return (
    <div className="payment-success-container bg-gradient-to-br from-pink-100 to-red-200">
      <div className="payment-success-card">
        <h1 className="payment-failure-title">Payment Failure</h1>
        <p className="payment-message">
          Your Payment was unsuccessful. Incase of any concern kindly contact
          Administrator or mail at naadnrutya@gmail.com
        </p>
        {payment_id && (
          <p className="payment-reference">
            <strong>Reference ID:</strong> {payment_id}
          </p>
        )}
        <p className="text-sm text-gray-500 mt-4">
          Redirecting you to the homepage in 10 seconds...
        </p>
      </div>
    </div>
  );
};

export default PaymentFailure;
