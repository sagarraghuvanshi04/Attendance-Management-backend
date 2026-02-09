const Student = require("../model/studentModel");
const sendEmail = require("../utils/sendEmail");

// Send payment reminder to a single student
exports.sendPaymentReminder = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const daysUntilExpiry = Math.ceil((new Date(student.expiry) - new Date()) / (1000 * 60 * 60 * 24));
    
    const htmlEmail = `
      <div style="background-color: #f1f5f9; padding: 40px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
          <tr>
            <td align="center" style="padding: 40px 20px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px; font-weight: 800;">SUCCESS POINT</h1>
              <p style="color: #e0e7ff; margin: 8px 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Digital Library & Study Zone</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 22px; font-weight: 700;">Payment Reminder</h2>
              <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                Hello ${student.name}, this is a friendly reminder about your library membership.
              </p>
              <div style="background-color: ${daysUntilExpiry <= 0 ? '#fef2f2' : '#fef9c3'}; border: 2px solid ${daysUntilExpiry <= 0 ? '#fca5a5' : '#fde047'}; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                <table width="100%" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom: 15px;">
                      <span style="display: block; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase;">Student ID</span>
                      <span style="display: block; color: #1e293b; font-size: 18px; font-weight: 700;">${student.studentId}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top: 1px solid ${daysUntilExpiry <= 0 ? '#fca5a5' : '#fde047'}; padding-top: 15px; padding-bottom: 15px;">
                      <span style="display: block; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase;">Membership Expiry</span>
                      <span style="display: block; color: ${daysUntilExpiry <= 0 ? '#dc2626' : '#ca8a04'}; font-size: 18px; font-weight: 700;">${new Date(student.expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top: 1px solid ${daysUntilExpiry <= 0 ? '#fca5a5' : '#fde047'}; padding-top: 15px;">
                      <span style="display: block; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase;">Status</span>
                      <span style="display: block; color: ${daysUntilExpiry <= 0 ? '#dc2626' : '#ca8a04'}; font-size: 18px; font-weight: 700;">
                        ${daysUntilExpiry <= 0 ? 'EXPIRED' : `Expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                <p style="color: #1e293b; font-size: 14px; font-weight: 600; margin: 0 0 10px;">💳 Renewal Options:</p>
                <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;">• Non-AC: Rs. 600/month</p>
                <p style="color: #64748b; font-size: 13px; margin: 0;">• AC: Rs. 800/month</p>
              </div>
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/student/payments" style="background-color: #4f46e5; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.4);">
                  Renew Membership Now
                </a>
              </div>
              <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 30px;">
                *Please renew your membership to continue enjoying uninterrupted access to our facilities.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #64748b; font-size: 14px; font-weight: 600; margin: 0;">Success Point Digital Library</p>
              <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0;">Near Main Gate, Digital Zone Path, 2026</p>
              <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0;">📞 +91 9876543210 | 📧 info@successpoint.com</p>
              <div style="margin-top: 15px;">
                <span style="color: #cbd5e1; font-size: 12px;">&copy; 2026 Success Point. All rights reserved.</span>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;

    await sendEmail(
      student.email,
      `Payment Reminder - Membership ${daysUntilExpiry <= 0 ? 'Expired' : 'Expiring Soon'}`,
      htmlEmail
    );

    res.status(200).json({
      success: true,
      message: `Payment reminder sent to ${student.name} (${student.email})`
    });
  } catch (error) {
    console.error("Send payment reminder error:", error);
    res.status(500).json({ message: "Failed to send payment reminder" });
  }
};

// Send bulk payment reminders
exports.sendBulkPaymentReminders = async (req, res) => {
  try {
    const { daysBeforeExpiry = 7 } = req.body;
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + parseInt(daysBeforeExpiry));
    
    const students = await Student.find({
      status: "Active",
      expiry: { $lte: targetDate }
    });

    if (students.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No students found with upcoming expiry",
        count: 0
      });
    }

    let successCount = 0;
    let failedCount = 0;

    for (const student of students) {
      try {
        const daysUntilExpiry = Math.ceil((new Date(student.expiry) - new Date()) / (1000 * 60 * 60 * 24));
        
        const htmlEmail = `
          <div style="background-color: #f1f5f9; padding: 40px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
              <tr>
                <td align="center" style="padding: 40px 20px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px; font-weight: 800;">SUCCESS POINT</h1>
                  <p style="color: #e0e7ff; margin: 8px 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Digital Library & Study Zone</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 22px; font-weight: 700;">Payment Reminder</h2>
                  <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                    Hello ${student.name}, this is a friendly reminder about your library membership.
                  </p>
                  <div style="background-color: ${daysUntilExpiry <= 0 ? '#fef2f2' : '#fef9c3'}; border: 2px solid ${daysUntilExpiry <= 0 ? '#fca5a5' : '#fde047'}; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 15px;">
                          <span style="display: block; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase;">Student ID</span>
                          <span style="display: block; color: #1e293b; font-size: 18px; font-weight: 700;">${student.studentId}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top: 1px solid ${daysUntilExpiry <= 0 ? '#fca5a5' : '#fde047'}; padding-top: 15px; padding-bottom: 15px;">
                          <span style="display: block; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase;">Membership Expiry</span>
                          <span style="display: block; color: ${daysUntilExpiry <= 0 ? '#dc2626' : '#ca8a04'}; font-size: 18px; font-weight: 700;">${new Date(student.expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top: 1px solid ${daysUntilExpiry <= 0 ? '#fca5a5' : '#fde047'}; padding-top: 15px;">
                          <span style="display: block; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase;">Status</span>
                          <span style="display: block; color: ${daysUntilExpiry <= 0 ? '#dc2626' : '#ca8a04'}; font-size: 18px; font-weight: 700;">
                            ${daysUntilExpiry <= 0 ? 'EXPIRED' : `Expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </div>
                  <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                    <p style="color: #1e293b; font-size: 14px; font-weight: 600; margin: 0 0 10px;">💳 Renewal Options:</p>
                    <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;">• Non-AC: Rs. 600/month</p>
                    <p style="color: #64748b; font-size: 13px; margin: 0;">• AC: Rs. 800/month</p>
                  </div>
                  <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL}/student/payments" style="background-color: #4f46e5; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.4);">
                      Renew Membership Now
                    </a>
                  </div>
                  <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 30px;">
                    *Please renew your membership to continue enjoying uninterrupted access to our facilities.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                  <p style="color: #64748b; font-size: 14px; font-weight: 600; margin: 0;">Success Point Digital Library</p>
                  <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0;">Near Main Gate, Digital Zone Path, 2026</p>
                  <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0;">📞 +91 9876543210 | 📧 info@successpoint.com</p>
                  <div style="margin-top: 15px;">
                    <span style="color: #cbd5e1; font-size: 12px;">&copy; 2026 Success Point. All rights reserved.</span>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        `;

        await sendEmail(
          student.email,
          `Payment Reminder - Membership ${daysUntilExpiry <= 0 ? 'Expired' : 'Expiring Soon'}`,
          htmlEmail
        );
        successCount++;
      } catch (err) {
        console.error(`Failed to send email to ${student.email}:`, err);
        failedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Payment reminders sent successfully`,
      total: students.length,
      success: successCount,
      failed: failedCount
    });
  } catch (error) {
    console.error("Send bulk payment reminders error:", error);
    res.status(500).json({ message: "Failed to send bulk payment reminders" });
  }
};

// Get students with upcoming expiry
exports.getExpiringStudents = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + parseInt(days));
    
    const students = await Student.find({
      status: "Active",
      expiry: { $lte: targetDate }
    }).select("studentId name email phone expiry seat course");

    const studentsWithDays = students.map(student => ({
      ...student.toObject(),
      daysUntilExpiry: Math.ceil((new Date(student.expiry) - new Date()) / (1000 * 60 * 60 * 24))
    }));

    res.status(200).json({
      success: true,
      count: studentsWithDays.length,
      students: studentsWithDays
    });
  } catch (error) {
    console.error("Get expiring students error:", error);
    res.status(500).json({ message: "Failed to fetch expiring students" });
  }
};
