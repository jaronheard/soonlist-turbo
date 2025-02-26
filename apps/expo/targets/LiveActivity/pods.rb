pod 'OneSignalXCFramework', '>= 5.0.0', '< 6.0'

# Use frameworks if specified in the main Podfile
use_frameworks! :linkage => podfile_properties['ios.useFrameworks'].to_sym if podfile_properties['ios.useFrameworks'] 