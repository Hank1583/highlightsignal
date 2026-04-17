export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-16 mt-20">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-10">

        <div>
          <h3 className="text-xl font-bold mb-4">Highlight Signal</h3>
          <p className="opacity-80 text-sm leading-relaxed">
            整合 GA、SEO、ADS 的行銷成效訊號平台。
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-3">產品</h4>
          <ul className="flex flex-col gap-2">
            <li>GA 數據系統</li>
            <li>SEO AI</li>
            <li>客服中心</li>
            <li>CRM</li>
            <li>廣告投放</li>
            <li>AI 業務助理</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">公司</h4>
          <ul className="flex flex-col gap-2">
            <li>關於我們</li>
            <li>聯絡方式</li>
            <li>隱私政策</li>
            <li>使用條款</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">社群</h4>
          <ul className="flex flex-col gap-2">
            <li>Facebook</li>
            <li>Instagram</li>
            <li>LinkedIn</li>
            <li>YouTube</li>
          </ul>
        </div>
      </div>

      <div className="text-center mt-12 opacity-60 text-sm">
        © 2025 Highlight Signal. All rights reserved.
      </div>
    </footer>
  );
}
