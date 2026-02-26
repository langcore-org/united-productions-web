"use client";

import { Bell, Menu, User, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  className?: string;
  onMenuClick?: () => void;
  showMobileMenu?: boolean;
}

export function Header({ className, onMenuClick, showMobileMenu }: HeaderProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Mock notifications
  const notifications = [
    {
      id: 1,
      title: "議事録の整形が完了しました",
      description: "会議「プロジェクトキックオフ」の整形が完了しました",
      time: "5分前",
      unread: true,
    },
    {
      id: 2,
      title: "新機能が追加されました",
      description: "リサーチ・考査機能が利用可能になりました",
      time: "1時間前",
      unread: true,
    },
    {
      id: 3,
      title: "メンテナンス予告",
      description: "2月20日 02:00-04:00にメンテナンスを実施します",
      time: "1日前",
      unread: false,
    },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header
      className={cn(
        "h-16 bg-[#0d0d12] border-b border-[#2a2a35]",
        "flex items-center justify-between px-4",
        className,
      )}
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-400 hover:bg-[#1a1a24] hover:text-gray-200"
        >
          {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Page Title - Can be passed as children or configured */}
        <h1 className="text-lg font-semibold text-white hidden sm:block">AI Hub</h1>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={cn(
              "relative p-2 rounded-lg",
              "text-gray-400 hover:bg-[#1a1a24] hover:text-gray-200",
              "transition-colors duration-200",
            )}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-gray-500 text-white text-xs flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => setIsNotificationsOpen(false)}
                aria-label="通知を閉じる"
              />
              <div
                className={cn(
                  "absolute right-0 top-full mt-2 z-50",
                  "w-80 max-h-96 overflow-y-auto",
                  "bg-[#1a1a24] border border-[#2a2a35] rounded-xl",
                  "shadow-xl shadow-black/50",
                )}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a35]">
                  <span className="text-sm font-semibold text-white">通知</span>
                  <button type="button" className="text-xs text-gray-400 hover:underline">
                    すべて既読にする
                  </button>
                </div>
                <div className="py-1">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500 text-sm">
                      通知はありません
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        type="button"
                        key={notification.id}
                        className={cn(
                          "w-full px-4 py-3 text-left",
                          "hover:bg-[#2a2a35] transition-colors",
                          "border-b border-[#2a2a35] last:border-b-0",
                        )}
                        onClick={() => setIsNotificationsOpen(false)}
                      >
                        <div className="flex items-start gap-3">
                          {notification.unread && (
                            <span className="w-2 h-2 mt-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                          )}
                          <div className={cn("flex-1", !notification.unread && "pl-5")}>
                            <p className="text-sm font-medium text-gray-200">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {notification.description}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">{notification.time}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <div className="px-4 py-2 border-t border-[#2a2a35]">
                  <button
                    type="button"
                    className="w-full text-center text-xs text-gray-500 hover:text-gray-300 py-1"
                  >
                    すべての通知を表示
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Menu */}
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 p-1.5 pr-3 rounded-lg",
            "hover:bg-[#1a1a24] transition-colors duration-200",
          )}
        >
          <div className="w-8 h-8 rounded-full bg-[#2a2a35] flex items-center justify-center">
            <User className="w-4 h-4 text-gray-400" />
          </div>
          <span className="text-sm text-gray-300 hidden md:block">ユーザー</span>
        </button>
      </div>
    </header>
  );
}
