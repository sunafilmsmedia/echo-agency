import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { HeroSection } from "@/components/ui/hero-section";
import { BenefitsSection } from "@/components/ui/benefits-section";

const Index = () => {
  const navigate = useNavigate();

  const scrollToBenefits = () => {
    document.getElementById("benefits")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLogin = () => {
    navigate("/login?redirect=/dashboard");
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-dark smooth-scroll">
      <Navigation onLoginClick={handleLogin} />
      <HeroSection onBenefitsClick={scrollToBenefits} onLoginClick={handleLogin} />
      <BenefitsSection onBackToTop={scrollToTop} onGetStarted={handleLogin} />
    </div>
  );
};

export default Index;
