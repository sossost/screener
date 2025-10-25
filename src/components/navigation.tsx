"use client";

import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

interface NavigationProps {
  title: string;
  showBackButton?: boolean;
}

export function Navigation({ title, showBackButton = true }: NavigationProps) {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <Link
                href="/"
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">뒤로</span>
              </Link>
            )}
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          </div>

          <Link
            href="/"
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span className="text-sm font-medium">홈</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
