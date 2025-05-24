import { ConvexAuthExample } from "~/components/ConvexAuthExample";

export default function AuthCheckPage() {
  return (
    <div className="bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-gray-800 md:text-5xl">
            Auth Check
          </h1>
          <p className="mt-6 text-xl leading-7.5 text-gray-400 md:text-2xl md:leading-9">
            Check your authentication status with Convex
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <ConvexAuthExample />
        </div>
      </div>
    </div>
  );
}
