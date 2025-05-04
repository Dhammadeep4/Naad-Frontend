import React, { useState, useEffect } from "react";
import "../styles/PaymentSuccess.css";
import { useLocation, useNavigate } from "react-router-dom";
import { backendUrl } from "../App";
import axios from "axios";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import logo from "../assets/logo.jpeg";
const PaymentSuccess = ({ user }) => {
  const [student, setStudent] = useState({});
  const query = new URLSearchParams(useLocation().search);
  const payment_id = query.get("reference");
  const student_id = user.student_id;
  const navigate = useNavigate();

  //function to fetch fees
  const fetchFees = async (year) => {
    try {
      const formattedYear = year.toLowerCase().replace(/ /g, "_");
      const res = await axios.get(
        `${backendUrl}/api/fee/amount/${formattedYear}`
      );
      if (res.data.success) return res.data.fee;
      else toast.error(res.data.message || "Could not fetch fees.");
    } catch (error) {
      toast.error("Error fetching fees.");
      console.error(error.message);
    }
  };
  //function to fetch profile
  const fetchProfile = async () => {
    try {
      const { student_id } = user;
      const res = await axios.get(
        `${backendUrl}/api/admin/studentProfile/${student_id}`
      );

      return res.data.profile; // ✅ return the profile
    } catch (error) {
      toast.error("Failed to fetch profile.");
      console.error(error.message);
      return null;
    }
  };

  //function to generate receipt and update paymentStatus
  const generateAndStoreReceipt = async () => {
    const studentProfile = await fetchProfile(); // ✅ wait for the profile

    if (!studentProfile) {
      console.error(
        "Failed to fetch student profile. Cannot generate receipt."
      );
      return;
    }

    const name = studentProfile.firstname + " " + studentProfile.lastname;
    const year = studentProfile.year;
    const amount = await fetchFees(year);
    const currentDate = new Date().toLocaleDateString();
    const doc = new jsPDF("p", "mm", [120, 160]); // Set page size to A5 (portrait, in mm)

    // Define margins
    const marginTop = 20;
    const marginLeft = 15;
    const marginRight = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add logo (centered)
    const imgProps = doc.getImageProperties(logo);
    const imgWidth = 50;
    const imgX = (pageWidth - imgWidth) / 2;
    doc.addImage(logo, "JPEG", imgX, marginTop, imgWidth, 20); // y = 10, height = 20

    // Add centered title "Payment Receipt" aligned to the left
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Receipt", marginLeft, marginTop + 30);

    // Add Date aligned to the right
    const dateX = pageWidth - marginRight - 20; // 40px left margin from the right side
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    // Draw a horizontal line below the title
    doc.setLineWidth(0.5);
    doc.line(
      marginLeft,
      marginTop + 35,
      pageWidth - marginRight,
      marginTop + 35
    );

    // Add payment details in a tabular format, centered
    const tableData = [
      { label: "Student Name:", value: name },
      { label: "Student Year:", value: year },
      { label: "Paid Amount:", value: `${amount}` },
      { label: "Reference Id:", value: `${payment_id}` },
      { label: "Payment Mode:", value: "Online" },
    ];

    let y = marginTop + 45; // Starting position for the table

    // Create table content
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    doc.text("Date:", dateX - 10, y); // Label "Date" aligned to the right
    doc.text(currentDate, dateX, y); // Date aligned to the right

    y += 10; // Adjust y for the data rows
    tableData.forEach((row) => {
      doc.text(row.label, marginLeft + 5, y); // Description column
      doc.text(row.value, marginLeft + 30, y); // Details column
      y += 8; // Space between rows
    });

    // Draw a line at the bottom of the table
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y + 5, pageWidth - marginRight, y + 5);

    y += 20;
    doc.setFont("helvetica", "bold");
    doc.text("**For any queries email to naadnrutya@gmail.com", marginLeft, y);

    const pdfBase64 = doc.output("datauristring"); // ✅ use 'doc' here

    try {
      const response = await axios.post(backendUrl + "/api/v1/updateDB", {
        student_id,
        payment_id,
        mode: "online",
        amount,
        receipt: pdfBase64,
      });

      if (response.data.success) {
        toast.success("Payment status updated successfully!");
        console.log("Payment status updated:", response.data);
      } else {
        toast.error("Failed to update payment status.");
        console.log("Error response:", response.data.message);
      }
    } catch (error) {
      console.error("Error updating payment status:", error.message);
      toast.error("Something went wrong while updating payment status.");
    }

    doc.save(`Receipt_${name}.pdf`); // ✅ download
  };

  useEffect(() => {
    const generateReceiptAndUpdate = async () => {
      await generateAndStoreReceipt();

      // Optional: Redirect after 10 seconds
      setTimeout(() => {
        navigate("/home");
      }, 10000);
    };

    generateReceiptAndUpdate();
    // Clean up timeout on component unmount
  }, []);

  return (
    <div className="payment-container">
      <div className="payment-display-card">
        <h1 className="payment-success-title">Payment Successful</h1>
        <p className="payment-message">
          Thank you for your payment. Your transaction was successful. Kindly
          save the receipt generated incase of any issues kindly contact the
          administrator or email at naadnrutya@gmail.com
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

export default PaymentSuccess;
