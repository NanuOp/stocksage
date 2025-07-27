import React, { useState } from 'react';

const SignupPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const darkThemeColors = {
    background: '#1A1A1D',
    cardBg: '#1F2024',
    textPrimary: '#E0E0E0',
    inputBg: '#FFFFFF',
    inputBorder: '#404045',
    inputFocusBorder: '#6A5ACD',
    buttonBg: '#6A5ACD',
    buttonHoverBg: '#7B68EE',
    logoColor: '#6A5ACD',
    shadowColor: 'rgba(106, 90, 205, 0.4)',
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("❌ Passwords do not match!");
      return;
    }
    console.log('Signing up:', { fullName, email, password });
    alert('✅ Sign up submitted (functionality not yet implemented)');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-inter rounded-3xl"
      style={{
        backgroundColor: darkThemeColors.background,
        backgroundImage: `radial-gradient(circle at center, ${darkThemeColors.background} 0%, rgba(0,0,0,0.8) 100%)`,
      }}
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23${darkThemeColors.inputBorder.substring(1)}" fill-opacity="0.4"%3E%3Cpath d="M0 0h60v60H0V0zm30 30h30v30H30V30z"/%3E%3C/g%3E%3C/svg%3E')`,
          maskImage: 'radial-gradient(circle at center, black 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 0%, transparent 70%)',
        }}
      ></div>

      <div
        className="relative z-10 w-full max-w-md p-10 rounded-3xl shadow-2xl animate-fade-in"
        style={{
          backgroundColor: darkThemeColors.cardBg,
          border: `1px solid ${darkThemeColors.inputBorder}`,
          boxShadow: `0 12px 30px ${darkThemeColors.shadowColor}`,
        }}
      >
        <h1 className="text-4xl font-extrabold mb-6 text-center" style={{ color: darkThemeColors.logoColor }}>
          StockSage
        </h1>
        <p className="text-lg font-medium mb-8 text-center" style={{ color: darkThemeColors.textPrimary }}>
          Create your account
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-2xl text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition" // Changed to rounded-2xl
            style={{
              backgroundColor: darkThemeColors.inputBg,
              border: `1px solid ${darkThemeColors.inputBorder}`,
              color: '#222',
              '--tw-ring-color': darkThemeColors.inputFocusBorder,
              '--tw-ring-offset-color': darkThemeColors.cardBg,
            }}
          />

          {/* Email */}
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-2xl text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition" // Changed to rounded-2xl
            style={{
              backgroundColor: darkThemeColors.inputBg,
              border: `1px solid ${darkThemeColors.inputBorder}`,
              color: '#222',
              '--tw-ring-color': darkThemeColors.inputFocusBorder,
              '--tw-ring-offset-color': darkThemeColors.cardBg,
            }}
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-2xl text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition" // Changed to rounded-2xl
            style={{
              backgroundColor: darkThemeColors.inputBg,
              border: `1px solid ${darkThemeColors.inputBorder}`,
              color: '#222',
              '--tw-ring-color': darkThemeColors.inputFocusBorder,
              '--tw-ring-offset-color': darkThemeColors.cardBg,
            }}
          />

          {/* Confirm Password */}
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-2xl text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition" // Changed to rounded-2xl
            style={{
              backgroundColor: darkThemeColors.inputBg,
              border: `1px solid ${darkThemeColors.inputBorder}`,
              color: '#222',
              '--tw-ring-color': darkThemeColors.inputFocusBorder,
              '--tw-ring-offset-color': darkThemeColors.cardBg,
            }}
          />

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl text-lg font-semibold shadow-lg transition-transform duration-300 transform hover:scale-105 focus:outline-none focus:ring-2"
            style={{
              backgroundColor: darkThemeColors.buttonBg,
              color: darkThemeColors.textPrimary,
              boxShadow: `0 5px 15px ${darkThemeColors.shadowColor}`,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = darkThemeColors.buttonHoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = darkThemeColors.buttonBg)}
          >
            Sign Up
          </button>
        </form>
      </div>

      {/* Animation and Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .animate-fade-in {
          animation: fadeInScale 0.8s ease-out forwards;
        }

        .font-inter {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
    </div>
  );
};

export default SignupPage;
