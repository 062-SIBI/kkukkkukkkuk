#!/usr/bin/env ruby
# 아이폰 산책 카드(위젯 익스텐션 WalkCard)를 Capacitor가 만든 App.xcodeproj에 붙인다.
# 쓰는 법(깃허브 액션 '앱 껍데기 만들기', native 폴더에서): ruby ../ios-kit/add-walkcard.rb ios/App
#   patch-ios.js post 다음에 한 번만 돈다. 출시 단계는 그 프로젝트를 다시 쓰므로 다시 돌리지 않는다.
#   이미 붙어 있으면 아무것도 바꾸지 않고 'walkcard: 이미 있음'을 찍고 끝낸다.
# 젬: xcodeproj 1.28.1 (gem install xcodeproj -v 1.28.1)
gem 'xcodeproj', '1.28.1'
require 'xcodeproj'
require 'fileutils'

ios = File.expand_path(ARGV[0] || abort('쓰는 법: ruby add-walkcard.rb <ios/App 경로>'))
kit = File.expand_path('walkcard', __dir__)
project = Xcodeproj::Project.open(File.join(ios, 'App.xcodeproj'))
if project.targets.any? { |t| t.name == 'WalkCard' }
  puts 'walkcard: 이미 있음'
  exit 0
end
app = project.targets.find { |t| t.name == 'App' } or abort('App 타깃이 없음')
app_group = project.main_group['App'] or abort('App 폴더 묶음이 없음')

# 파일을 프로젝트 폴더로 복사한다(Shared는 두 타깃, App은 앱, Extension은 위젯)
dirs = {
  'Shared' => File.join(ios, 'WalkCardShared'),
  'App' => File.join(ios, 'App', 'WalkCardApp'),
  'Extension' => File.join(ios, 'WalkCard')
}
dirs.each do |k, d|
  FileUtils.mkdir_p(d)
  Dir[File.join(kit, k, '*')].each { |f| FileUtils.cp_r(f, d) }   # Assets.xcassets 같은 폴더도 통째로
end

ext = project.new_target(:app_extension, 'WalkCard', :ios, '16.2', nil, :swift)
groups = {
  'Shared' => project.main_group.new_group('WalkCardShared', 'WalkCardShared'),
  'App' => app_group.new_group('WalkCardApp', 'WalkCardApp'),
  'Extension' => project.main_group.new_group('WalkCard', 'WalkCard')
}
users = { 'Shared' => [app, ext], 'App' => [app], 'Extension' => [ext] }
dirs.each do |k, d|
  Dir[File.join(d, '*')].sort.each do |f|
    ref = groups[k].new_reference(File.basename(f))
    if f.end_with?('.swift')
      users[k].each { |t| t.add_file_references([ref]) }
    elsif f.end_with?('.xcprivacy') || f.end_with?('.xcassets')   # 개인정보 파일, 버튼 아이콘
      users[k].each { |t| t.add_resources([ref]) }
    end
  end
end

app_cfg = app.build_configurations.to_h { |c| [c.name, c.build_settings] }
ext.build_configurations.each do |c|
  s = c.build_settings
  a = app_cfg[c.name] || app_cfg.values.first
  s['PRODUCT_NAME'] = '$(TARGET_NAME)'
  s['PRODUCT_BUNDLE_IDENTIFIER'] = "#{a['PRODUCT_BUNDLE_IDENTIFIER']}.walkcard"
  s['INFOPLIST_FILE'] = 'WalkCard/Info.plist'
  s['GENERATE_INFOPLIST_FILE'] = 'NO'
  s['MARKETING_VERSION'] = a['MARKETING_VERSION']
  s['CURRENT_PROJECT_VERSION'] = a['CURRENT_PROJECT_VERSION']
  s['IPHONEOS_DEPLOYMENT_TARGET'] = '16.2'
  s['SWIFT_VERSION'] = '5.0'
  s['TARGETED_DEVICE_FAMILY'] = '1'
  s['SKIP_INSTALL'] = 'YES'
  s['CODE_SIGN_STYLE'] = 'Automatic'
  s['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
  s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
  s['DEVELOPMENT_TEAM'] = a['DEVELOPMENT_TEAM'] if a['DEVELOPMENT_TEAM']
end

# 앱의 최소 iOS는 그대로 둔다. ActivityKit(16.1)과 AppIntents(16)는 약하게 이어 옛 아이폰에서도 켜지게 한다
app.build_configurations.each do |c|
  flags = Array(c.build_settings['OTHER_LDFLAGS'] || '$(inherited)')
  flags += ['-weak_framework', 'ActivityKit', '-weak_framework', 'AppIntents']
  c.build_settings['OTHER_LDFLAGS'] = flags
end

app.add_dependency(ext)
embed = app.new_copy_files_build_phase('Embed Foundation Extensions')
embed.symbol_dst_subfolder_spec = :plug_ins
build_file = embed.add_file_reference(ext.product_reference, true)
build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }

project.save
puts "walkcard: 붙임(번들 #{ext.build_configurations.first.build_settings['PRODUCT_BUNDLE_IDENTIFIER']}, iOS 16.2, 파일 #{Dir[File.join(kit, '*', '*')].size}개)"
