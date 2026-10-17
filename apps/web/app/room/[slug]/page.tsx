export default async function RoomPage({
    params
}: {
    params: Promise<{
        slug: string;
    }>;
}) {
    const { slug } = await params;
    return (
        <div style={{ padding: 20, fontFamily: "sans-serif" }}>
            <h1>Room: {slug}</h1>
        </div>
    );
}