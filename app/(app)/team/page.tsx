import { Mail, ShieldCheck, UserPlus, UsersRound } from "lucide-react";

const members = [
  { name: "Hank", email: "jouchanghung@gmail.com", role: "Owner", status: "Active" },
  { name: "Marketing", email: "marketing@example.com", role: "Editor", status: "Pending" },
  { name: "Analyst", email: "analyst@example.com", role: "Viewer", status: "Active" },
];

export default function TeamPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            Team
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            團隊管理
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            管理團隊成員、角色權限與模組存取。邀請功能可在串接 API 後啟用。
          </p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700">
          <UserPlus size={18} />
          邀請成員
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "團隊成員", value: "3", icon: UsersRound },
          { label: "待確認邀請", value: "1", icon: Mail },
          { label: "權限角色", value: "3", icon: ShieldCheck },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <Icon className="h-6 w-6 text-blue-600" />
              <p className="mt-4 text-sm font-semibold text-slate-500">{item.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{item.value}</p>
            </div>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">成員清單</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3">成員</th>
                <th className="px-6 py-3">角色</th>
                <th className="px-6 py-3">狀態</th>
                <th className="px-6 py-3">可用模組</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => (
                <tr key={member.email}>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{member.name}</p>
                    <p className="text-slate-500">{member.email}</p>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">{member.role}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">GA, SEO, ADS</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
