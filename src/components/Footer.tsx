import { Badge } from "@/components/ui/badge";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Zocdoc Column */}
          <div>
            <h3 className="font-semibold mb-4">Zocdoc</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-background">Home</a></li>
              <li><a href="#" className="text-gray-300 hover:text-background">About us</a></li>
              <li><a href="#" className="text-gray-300 hover:text-background">Press</a></li>
              <li><a href="#" className="text-gray-300 hover:text-background">Careers</a></li>
              <li><a href="#" className="text-gray-300 hover:text-background">Contact us</a></li>
              <li><a href="#" className="text-gray-300 hover:text-background">Help</a></li>
            </ul>
          </div>

          {/* Discover Column */}
          <div>
            <h3 className="font-semibold mb-4">Discover</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-background">The Paper Gown: Stories for and about patients</a></li>
              <li><a href="#" className="text-gray-300 hover:text-background">Practice Resources for providers</a></li>
              <li><a href="#" className="text-gray-300 hover:text-background">Community Standards</a></li>
              <li><a href="#" className="text-gray-300 hover:text-background">Data and privacy</a></li>
              <li><a href="#" className="text-gray-300 hover:text-background">Verified reviews</a></li>
              <li>
                <div className="flex items-center">
                  <a href="#" className="text-gray-300 hover:text-background mr-2">Tech Blog</a>
                  <Badge className="bg-yellow-400 text-foreground text-xs">New</Badge>
                </div>
              </li>
            </ul>
          </div>

          {/* Insurance Carriers Column */}
          <div>
            <h3 className="font-semibold mb-4 underline">Insurance Carriers</h3>
          </div>

          {/* Top Specialties Column */}
          <div>
            <h3 className="font-semibold mb-4 underline">Top Specialties</h3>
          </div>

          {/* Right Column */}
          <div>
            <h3 className="font-semibold mb-4">Are you a top doctor or health service?</h3>
            <ul className="space-y-2">
              <li>
                <div className="flex items-center">
                  <a href="#" className="text-gray-300 hover:text-background mr-2">Try Zo, your AI Phone Assistant</a>
                  <Badge className="bg-yellow-400 text-foreground text-xs">New</Badge>
                </div>
              </li>
              <li><a href="#" className="text-gray-300 hover:text-background">List your practice on Zocdoc</a></li>
              <li><a href="#" className="text-gray-300 hover:text-background">Become an EHR partner</a></li>
              <li><a href="#" className="text-gray-300 hover:text-background">Access Zocdoc for Developers</a></li>
              <li><a href="#" className="text-gray-300 hover:text-background">Learn about Zocdoc Enterprise Solutions</a></li>
            </ul>
            
            <div className="mt-8">
              <h4 className="font-semibold mb-4">Get the Zocdoc app</h4>
              <div className="space-y-2">
                <div className="bg-background text-foreground px-3 py-1 rounded text-sm w-fit">📱 App Store</div>
                <div className="bg-background text-foreground px-3 py-1 rounded text-sm w-fit">📱 Google Play</div>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-gray-600 pt-8 mb-8">
          <p className="text-gray-300 text-sm leading-relaxed">
            The content provided here and elsewhere on the Zocdoc site or mobile app is provided for general informational purposes only. It is not intended as, and Zocdoc does not provide, medical advice, diagnosis or treatment. Always contact your healthcare provider directly with any questions you may have regarding your health or specific medical advice.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-600 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-6 mb-4 md:mb-0">
            <span className="text-gray-300">© 2025 Zocdoc, Inc.</span>
            <a href="#" className="text-gray-300 hover:text-background">Terms</a>
            <a href="#" className="text-gray-300 hover:text-background">Privacy</a>
            <a href="#" className="text-gray-300 hover:text-background">Consumer Health</a>
            <a href="#" className="text-gray-300 hover:text-background">Site map</a>
            <a href="#" className="text-gray-300 hover:text-background">Your privacy choices</a>
          </div>
          
          <div className="flex space-x-4">
            <div className="w-6 h-6 bg-gray-600 rounded"></div>
            <div className="w-6 h-6 bg-gray-600 rounded"></div>
            <div className="w-6 h-6 bg-gray-600 rounded"></div>
            <div className="w-6 h-6 bg-gray-600 rounded"></div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;