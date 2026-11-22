const LINKS = [
  ['huong-dan', 'Hướng dẫn sử dụng'],
  ['gioi-thieu', 'Giới thiệu'],
  ['lien-he', 'Liên hệ'],
  ['chinh-sach-bao-mat', 'Chính sách bảo mật'],
  ['dieu-khoan', 'Điều khoản sử dụng'],
]

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-slate-200 pt-4 text-center text-sm text-slate-500">
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {LINKS.map(([href, label]) => (
          <a key={href} href={`./${href}`} className="hover:text-sky-700 hover:underline">
            {label}
          </a>
        ))}
      </nav>
      <p className="mt-2">© {new Date().getFullYear()} Tạo bài tập về nhà · Ảnh của bạn được xử lý ngay trên máy, không tải lên mạng.</p>
    </footer>
  )
}
