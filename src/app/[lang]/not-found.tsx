import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap narrow" style={{ paddingBlock: "4rem" }}>
      <h1>This page does not exist.</h1>
      <p lang="am">ይህ ገጽ የለም።</p>
      <p>
        <Link href="/en">Sign &amp; Sky</Link> · <Link href="/am">አማርኛ</Link>
      </p>
    </main>
  );
}
