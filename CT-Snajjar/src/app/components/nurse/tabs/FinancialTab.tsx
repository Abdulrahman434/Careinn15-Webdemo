import { DollarSign, Eye, EyeOff } from "lucide-react";
import { useTheme } from "../../ThemeContext";
import { useNurseStore, nurseActions } from "../../NurseDataStore";

export function FinancialTab({ role }: { role: "nurse" | "doctor" }) {
  const { theme: t } = useTheme();
  const store = useNurseStore();
  const isNurse = role === "nurse";

  const totalAmount = store.financial.reduce((s, f) => s + f.amount, 0);
  const totalCovered = store.financial.reduce((s, f) => s + f.covered, 0);
  const patientOwes = totalAmount - totalCovered;

  return (
    <div className="space-y-5">
      {isNurse && (
        <div className="nurse-card flex items-center justify-between" style={{ marginBottom: 0 }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: t.primarySubtle }}>
              <Eye size={18} style={{ color: t.primary }} />
            </div>
            <div>
              <span style={{ fontSize: "14px", fontWeight: 700, color: t.textHeading, display: "block" }}>Show Section to Patient</span>
              <span style={{ fontSize: "12px", color: t.textMuted }}>Toggle visibility for "Financial" on the bedside screen</span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={store.sectionVisibility.financial}
              onChange={(e) => nurseActions.setSectionVisible("financial", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"
              style={{ backgroundColor: store.sectionVisibility.financial ? t.primary : "#E5E7EB" }} />
          </label>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Charges", value: totalAmount, color: t.textHeading },
          { label: "Insurance Covered", value: totalCovered, color: t.success },
          { label: "Patient Responsibility", value: patientOwes, color: t.error },
        ].map((item) => (
          <div key={item.label} className="nurse-card text-center" style={{ marginBottom: 0 }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: t.textMuted, marginBottom: 8 }}>{item.label}</p>
            <p style={{ fontSize: "28px", fontWeight: 900, color: item.color }}>
              SAR {item.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div className="nurse-card">
        <h3 style={{ color: t.textHeading }}><DollarSign size={18} style={{ color: t.primary }} /> Breakdown</h3>
        <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${t.borderDefault}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB" }}>
                {["Category", "Description", "Date", "Amount", "Covered", "Balance"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: t.textMuted, borderBottom: `1px solid ${t.borderDefault}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {store.financial.map((f) => (
                <tr key={f.id} style={{ borderBottom: `1px solid ${t.borderDefault}` }}>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: t.textHeading }}>{f.category}</td>
                  <td style={{ padding: "10px 14px", color: t.textBody }}>{f.description}</td>
                  <td style={{ padding: "10px 14px", color: t.textMuted }}>{f.date}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: t.textHeading }}>SAR {f.amount.toLocaleString()}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: t.success }}>SAR {f.covered.toLocaleString()}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: t.error }}>SAR {(f.amount - f.covered).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
