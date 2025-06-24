'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Service, ServiceType } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';
import { responsiveClasses as rc, animationClasses as ac } from '@/lib/animations';
import { Navbar } from '@/components/ui/navbar';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [featuredServices, setFeaturedServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFeaturedServices();
  }, []);

  const loadFeaturedServices = async () => {
    try {
      const response = await databaseService.getActiveServices();
      if (response.success && response.data) {
        // Get first 3 services for featured section
        setFeaturedServices(response.data.slice(0, 3));
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      <Navbar />

      {/* Hero Section - Enhanced */}
      <section className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white overflow-hidden relative min-h-[90vh] flex items-center">
        {/* Enhanced floating elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-full animate-float"></div>
          <div className="absolute top-40 right-20 w-16 h-16 md:w-20 md:h-20 bg-purple-300/20 rounded-full animate-float animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/4 w-12 h-12 md:w-16 md:h-16 bg-blue-300/20 rounded-full animate-float animation-delay-4000"></div>
          <div className="absolute top-1/2 right-10 w-8 h-8 md:w-12 md:h-12 bg-pink-300/15 rounded-full animate-float animation-delay-3000"></div>
        </div>

        <div className={`${rc.container} py-12 md:py-16 lg:py-24 relative z-10`}>
          <div className="text-center">
            <div className={`${ac.fadeIn}`} style={{ animationDelay: '0.2s' }}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight">
              Lagos Premier 
              <br />
                <span className="bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent inline-block transform hover:scale-105 transition-transform duration-500">
                  Laundry Service
                </span>
            </h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-blue-100 mb-6 md:mb-8 max-w-4xl mx-auto leading-relaxed px-4">
              Professional laundry pickup and delivery service across Lagos State. 
                Perfect for busy professionals, entrepreneurs, and modern families.
            </p>
            </div>
            
            <div className={`flex flex-col sm:flex-row gap-3 md:gap-4 lg:gap-6 justify-center items-center mb-8 md:mb-12 px-4 ${ac.slideIn}`} style={{ animationDelay: '0.4s' }}>
              <Link
                href={isAuthenticated ? "/book" : "/register"}
                className="group bg-white text-blue-600 hover:bg-gray-50 px-6 md:px-8 py-3 md:py-4 rounded-2xl text-base md:text-lg font-bold transition-all duration-300 hover:scale-105 w-full sm:w-auto relative overflow-hidden shadow-xl hover:shadow-2xl"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                Book Laundry Service
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
              </Link>
              <Link
                href="/services"
                className="group border-2 border-white/80 text-white hover:bg-white hover:text-blue-600 px-6 md:px-8 py-3 md:py-4 rounded-2xl text-base md:text-lg font-bold transition-all duration-300 hover:scale-105 w-full sm:w-auto backdrop-blur-sm"
              >
                <span className="flex items-center justify-center">
                  <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                View Services
                </span>
              </Link>
            </div>

            {/* Enhanced Service Areas */}
            <div className={`text-center px-4 ${ac.fadeIn}`} style={{ animationDelay: '0.6s' }}>
              <p className="text-blue-200 mb-4 md:mb-6 text-base md:text-lg font-medium">🌍 Serving Lagos Areas:</p>
              <div className="flex flex-wrap justify-center gap-2 md:gap-3 max-w-4xl mx-auto">
                {['Ajah',
'Abraham Adesanya',
'Sangotedo', 
'United Estate', 
'GRA',
'Fara park Estate', 
'Thomas Estate',
'Ibeju lekki',
'Awoyaya',
'Ogidan',
'Eleko', 
'Dangote refinery','Lagos Island', 'Victoria Island', 'Ikoyi', 'Lekki', 'Ikeja', 'Surulere', 'Yaba', 'Gbagada', ].map((area, index) => (
                  <span
                    key={area}
                    className={`bg-white/20 backdrop-blur-sm text-white px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transform hover:scale-110 transition-all duration-300 hover:bg-white/30 border border-white/20 ${ac.fadeIn}`}
                    style={{ animationDelay: `${0.6 + (index * 0.1)}s` }}
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>

            {/* Enhanced Trust indicators */}
            <div className={`flex flex-wrap justify-center items-center gap-4 md:gap-6 lg:gap-8 mt-8 md:mt-12 px-4 ${ac.fadeIn}`} style={{ animationDelay: '0.8s' }}>
              <div className="flex items-center text-blue-200">
                <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs md:text-sm font-medium">1000+ Happy Customers</span>
              </div>
              <div className="flex items-center text-blue-200">
                <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs md:text-sm font-medium">Same Day Service</span>
              </div>
              <div className="flex items-center text-blue-200">
                <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs md:text-sm font-medium">Eco-Friendly</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-white relative overflow-hidden">
        <div className={rc.container}>
          <div className={`text-center mb-12 md:mb-16 ${ac.fadeIn}`}>
            <div className="inline-flex items-center bg-blue-100 text-blue-600 px-3 md:px-4 py-2 rounded-full text-sm font-medium mb-4 md:mb-6">
              <svg className="w-3 h-3 md:w-4 md:h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Why Choose Us
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 md:mb-6 px-4">
            LAUNDROMAT

              <span className="block md:inline bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Laundry Service</span>
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
            A self-service laundry, is a facility where clothes and some household textiles are washed and dried without much personalized professional help
            </p>
          </div>

          {/* Professional Facility Images */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-12 md:mb-16 ${ac.fadeIn}`} style={{ animationDelay: '0.1s' }}>
            <div className="relative group overflow-hidden rounded-2xl md:rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500">
              <img 
                src="/icon/wash1.jpg" 
                alt="Professional laundry facility with modern washing machines"
                className="w-full h-64 md:h-80 object-cover transform group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute bottom-4 left-4 right-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <h3 className="text-lg md:text-xl font-bold mb-1">Modern Equipment</h3>
                <p className="text-sm md:text-base text-gray-200">State-of-the-art washing machines for optimal care</p>
              </div>
            </div>
            
            <div className="relative group overflow-hidden rounded-2xl md:rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500">
              <img 
                src="/icon/wash2.jpg" 
                alt="Clean and organized laundry workspace"
                className="w-full h-64 md:h-80 object-cover transform group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute bottom-4 left-4 right-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <h3 className="text-lg md:text-xl font-bold mb-1">Professional Facility</h3>
                <p className="text-sm md:text-base text-gray-200">Clean, organized workspace for premium service</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 lg:gap-12">
            {[
              {
                icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                title: "Quick Pickup & Delivery",
                description: "Same-day pickup and 24-48 hour turnaround across Lagos State",
                gradient: "from-blue-500 to-blue-600",
                bgGradient: "from-blue-50 to-blue-100"
              },
              {
                icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                title: "Professional Quality",
                description: "Expert care for all fabric types with eco-friendly cleaning solutions",
                gradient: "from-emerald-500 to-emerald-600",
                bgGradient: "from-emerald-50 to-emerald-100"
              },
              {
                icon: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
                title: "Easy Online Booking",
                description: "Book online, track your order, and pay with multiple Nigerian payment options",
                gradient: "from-purple-500 to-purple-600",
                bgGradient: "from-purple-50 to-purple-100"
              }
            ].map((feature, index) => (
              <div 
                key={feature.title} 
                className={`text-center transform hover:scale-105 transition-all duration-300 bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-lg hover:shadow-xl border border-gray-100 ${ac.slideIn}`}
                style={{ animationDelay: `${0.2 + (index * 0.2)}s` }}
              >
                <div className={`bg-gradient-to-r ${feature.bgGradient} rounded-xl md:rounded-2xl p-4 md:p-6 w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 flex items-center justify-center group hover:scale-110 transition-all duration-300 shadow-lg`}>
                  <svg className={`w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ stroke: `url(#gradient-${index})` }}>
                    <defs>
                      <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={feature.gradient.includes('blue') ? '#3b82f6' : feature.gradient.includes('emerald') ? '#10b981' : '#8b5cf6'} />
                        <stop offset="100%" stopColor={feature.gradient.includes('blue') ? '#2563eb' : feature.gradient.includes('emerald') ? '#059669' : '#7c3aed'} />
                      </linearGradient>
                    </defs>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                </svg>
              </div>
                <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mb-3 md:mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm md:text-base lg:text-lg">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/30 to-transparent pointer-events-none"></div>
        <div className="absolute top-10 right-10 w-24 h-24 md:w-32 md:h-32 bg-blue-100/50 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-32 h-32 md:w-40 md:h-40 bg-purple-100/50 rounded-full blur-3xl"></div>
      </section>

      {/* Enhanced Featured Services */}
      <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 relative">
        <div className={rc.container}>
          <div className={`text-center mb-12 md:mb-16 ${ac.fadeIn}`}>
            <div className="inline-flex items-center bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-600 px-3 md:px-4 py-2 rounded-full text-sm font-medium mb-4 md:mb-6">
              <svg className="w-3 h-3 md:w-4 md:h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Our Services
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 md:mb-6 px-4">
              Professional Laundry Services
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Tailored for Lagos</span>
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
              From everyday essentials to delicate garments, we provide comprehensive laundry solutions 
              that fit your busy lifestyle.
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`bg-white rounded-2xl md:rounded-3xl shadow-lg p-6 md:p-8 animate-pulse ${ac.fadeIn}`} style={{ animationDelay: `${i * 0.2}s` }}>
                  <div className="h-5 md:h-6 bg-gray-200 rounded-lg mb-3 md:mb-4"></div>
                  <div className="h-3 md:h-4 bg-gray-200 rounded mb-2 md:mb-3"></div>
                  <div className="h-3 md:h-4 bg-gray-200 rounded mb-4 md:mb-6"></div>
                  <div className="flex items-center justify-between">
                    <div className="h-6 md:h-8 bg-gray-200 rounded w-20 md:w-24"></div>
                    <div className="h-4 md:h-6 bg-gray-200 rounded w-16 md:w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-12">
              {featuredServices.map((service, index) => (
                <div 
                  key={service.$id} 
                  className={`bg-white rounded-2xl md:rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 p-6 md:p-8 transform hover:scale-105 hover:-translate-y-2 border border-gray-100 group ${ac.slideIn}`}
                  style={{ animationDelay: `${0.2 + (index * 0.2)}s` }}
                >
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <span className="text-xl md:text-2xl">
                        {service.type === ServiceType.WASH_AND_FOLD ? '🧺' : 
                         service.type === ServiceType.DRY_CLEANING ? '👔' : 
                         service.type === ServiceType.IRONING ? '👕' : '🧽'}
                      </span>
                    </div>
                    <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-600 capitalize">
                      {service.type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mb-2 md:mb-3 group-hover:text-blue-600 transition-colors duration-300">
                    {service.name}
                  </h3>
                  <p className="text-gray-600 mb-4 md:mb-6 leading-relaxed text-sm md:text-base">
                    {service.description}
                  </p>
                  
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl md:rounded-2xl p-3 md:p-4 mb-4 md:mb-6">
                  <div className="flex items-center justify-between">
                      <span className="text-xs md:text-sm font-medium text-gray-700">Starting from</span>
                      <span className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {formatNairaFromKobo(service.basePrice)}
                        {service.pricePerKg && <span className="text-xs md:text-sm text-gray-500 font-normal">/kg</span>}
                    </span>
                    </div>
                  </div>

                  <Link
                    href={`/services?service=${service.$id}`}
                    className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-center py-2.5 md:py-3 px-4 md:px-6 rounded-xl md:rounded-2xl font-semibold transition-all duration-300 transform group-hover:scale-105 text-sm md:text-base"
                  >
                    Learn More
                  </Link>
                </div>
              ))}
            </div>
          )}

          <div className={`text-center mt-8 md:mt-12 ${ac.fadeIn}`} style={{ animationDelay: '0.8s' }}>
            <Link
              href="/services"
              className="inline-flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl text-base md:text-lg font-bold transition-all duration-300 hover:scale-105 transform shadow-xl hover:shadow-2xl"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              View All Services
              <svg className="w-4 h-4 md:w-5 md:h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/30 via-indigo-100/20 to-transparent pointer-events-none"></div>
        <div className="absolute top-20 right-20 w-32 h-32 md:w-40 md:h-40 bg-gradient-to-r from-blue-200/30 to-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 md:w-32 md:h-32 bg-gradient-to-r from-indigo-200/30 to-pink-200/30 rounded-full blur-3xl"></div>
      </section>

      {/* Enhanced How It Works */}
      <section className="py-12 md:py-16 lg:py-20 bg-white relative overflow-hidden">
        <div className={rc.container}>
          <div className={`text-center mb-12 md:mb-16 ${ac.fadeIn}`}>
            <div className="inline-flex items-center bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-600 px-3 md:px-4 py-2 rounded-full text-sm font-medium mb-4 md:mb-6">
              <svg className="w-3 h-3 md:w-4 md:h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              How It Works
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 md:mb-6 px-4">
              Simple Steps to 
              <span className="block bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">Clean Clothes</span>
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
              Getting your laundry done professionally has never been easier. 
              Just follow these simple steps and let us handle the rest.
            </p>
          </div>

          {/* Process Illustration with Real Image */}
          <div className={`mb-12 md:mb-16 ${ac.fadeIn}`} style={{ animationDelay: '0.1s' }}>
            <div className="relative max-w-4xl mx-auto">
              <div className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl">
                <img 
                  src="/icon/wash1.jpg" 
                  alt="Professional laundry process in action"
                  className="w-full h-48 md:h-64 lg:h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-purple-600/80"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2 md:mb-4">
                      Professional Laundry Process
                    </h3>
                    <p className="text-sm md:text-base lg:text-lg opacity-90 max-w-2xl px-4">
                      Our state-of-the-art facility ensures your clothes receive the best care possible
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 lg:gap-12">
            {[
              {
                number: 1,
                title: "Book Online",
                description: "Schedule pickup time and select your services",
                icon: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
                gradient: "from-blue-500 to-blue-600",
                bgGradient: "from-blue-50 to-blue-100"
              },
              {
                number: 2,
                title: "We Pickup",
                description: "Our team collects your laundry from your location",
                icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
                gradient: "from-emerald-500 to-emerald-600",
                bgGradient: "from-emerald-50 to-emerald-100"
              },
              {
                number: 3,
                title: "We Clean",
                description: "Professional cleaning with care and attention",
                icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                gradient: "from-purple-500 to-purple-600",
                bgGradient: "from-purple-50 to-purple-100"
              },
              {
                number: 4,
                title: "We Deliver",
                description: "Fresh, clean clothes delivered back to you",
                icon: "M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4",
                gradient: "from-amber-500 to-amber-600",
                bgGradient: "from-amber-50 to-amber-100"
              }
            ].map((step, index) => (
              <div 
                key={step.number}
                className={`text-center group ${ac.slideIn}`}
                style={{ animationDelay: `${0.2 + (index * 0.2)}s` }}
              >
                <div className="relative mb-4 md:mb-6">
                  <div className={`bg-gradient-to-r ${step.bgGradient} rounded-2xl md:rounded-3xl p-4 md:p-6 w-16 h-16 md:w-20 md:h-20 mx-auto flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-xl`}>
                    <svg className={`w-6 h-6 md:w-8 md:h-8 text-${step.gradient.split('-')[1]}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
                    </svg>
                  </div>
                  <div className={`absolute -bottom-1 md:-bottom-2 -right-1 md:-right-2 bg-gradient-to-r ${step.gradient} text-white rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center font-bold text-xs md:text-sm shadow-lg`}>
                    {step.number}
                  </div>
                </div>
                <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mb-2 md:mb-3 group-hover:text-blue-600 transition-colors duration-300">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-white/5 opacity-20"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className={`${ac.fadeIn}`}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight">
              Ready to Experience
              <span className="block bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
                Lagos' Best Laundry Service?
              </span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-blue-100 mb-8 md:mb-12 max-w-4xl mx-auto leading-relaxed">
              Join thousands of satisfied customers across Lagos State. Book your first pickup today 
              and discover why we're the preferred choice for busy professionals and families.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 lg:gap-6 justify-center items-center">
              <Link
                href={isAuthenticated ? "/book" : "/register"}
                className="group bg-white text-blue-600 hover:bg-gray-50 px-6 md:px-8 py-3 md:py-4 rounded-2xl text-base md:text-lg font-bold transition-all duration-300 hover:scale-105 w-full sm:w-auto relative overflow-hidden shadow-xl hover:shadow-2xl"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {isAuthenticated ? "Book Now" : "Get Started Today"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
              </Link>
              
              <Link
                href="/services"
                className="group border-2 border-white/80 text-white hover:bg-white hover:text-blue-600 px-6 md:px-8 py-3 md:py-4 rounded-2xl text-base md:text-lg font-bold transition-all duration-300 hover:scale-105 w-full sm:w-auto backdrop-blur-sm"
              >
                <span className="flex items-center justify-center">
                  <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Explore Services
                </span>
              </Link>
            </div>

            {/* Enhanced Trust badges */}
            <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 lg:gap-8 mt-8 md:mt-12 opacity-80">
              <div className="flex items-center text-blue-200">
                <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs md:text-sm font-medium">Trusted by 1000+ Customers</span>
              </div>
              <div className="flex items-center text-blue-200">
                <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs md:text-sm font-medium">100% Satisfaction Guarantee</span>
              </div>
              <div className="flex items-center text-blue-200">
                <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs md:text-sm font-medium">Free Pickup & Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-gray-900 text-white py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="sm:col-span-2 md:col-span-1">
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Gab'z Laundromat</h3>
              <p className="text-gray-400 mb-3 md:mb-4 text-sm md:text-base">
                Lagos Premier Laundry Service providing convenient pickup and delivery 
                across Lagos State.
              </p>
              <p className="text-gray-400 text-sm md:text-base">
                📞 +234 800 000 0000<br />
                📧 hello@gabzlaundromat.com
              </p>
            </div>

            <div>
              <h4 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Services</h4>
              <ul className="space-y-1.5 md:space-y-2 text-gray-400 text-sm md:text-base">
                <li>Wash & Fold</li>
                <li>Dry Cleaning</li>
                <li>Ironing Service</li>
                <li>Express Service</li>
              </ul>
            </div>

            <div>
              <h4 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Service Areas</h4>
              <ul className="space-y-1.5 md:space-y-2 text-gray-400 text-sm md:text-base">
              <li>Ajah</li>
                <li>Abraham Adesanya
                </li>
                <li>Sangotedo</li>
                <li>United Estate</li>
                <li>GRA
                </li>
                <li>Fara park Estate</li>
                <li>Thomas Estate
                </li>
                <li>Ibeju lekki
                </li>
                <li>Awoyaya
                </li>
                <li>Ogidan
                </li>
                <li>Eleko </li>
                <li>Dangote refinery</li>
                <li>Lagos Island</li>
                <li>Victoria Island</li>
                <li>Ikoyi</li>
                <li>Lekki</li>
                <li>Ikeja</li>
                <li>Surulere</li>
                
              </ul>
            </div>

            <div>
              <h4 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Quick Links</h4>
              <ul className="space-y-1.5 md:space-y-2 text-gray-400 text-sm md:text-base">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-6 md:mt-8 pt-6 md:pt-8 text-center text-gray-400 text-sm md:text-base">
            <p>&copy; 2024 Gab'z Laundromat. All rights reserved. | Lagos State, Nigeria</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
