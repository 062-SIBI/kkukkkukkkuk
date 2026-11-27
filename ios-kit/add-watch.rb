#!/usr/bin/env ruby
# 꾹꾹이 워치 앱(KkukWatch, 0.5.3)을 Capacitor가 만든 App.xcodeproj에 붙인다. 워치 한 타깃짜리 SwiftUI 앱(watchOS 9.0 이상).
# 쓰는 법(깃허브 액션 '앱 껍데기 만들기', native 폴더에서, add-walkcard.rb 다음): ruby ../ios-kit/add-watch.rb ios/App
#   이미 붙어 있으면 아무것도 바꾸지 않고 'watch: 이미 있음'을 찍고 끝낸다.
# 아이폰 앱 안 Watch 폴더에 넣고(Embed Watch Content), 아이폰 앱이 워치 앱을 먼저 만들게 한다.
# 번들 아이디는 아이폰 앱 아이디 뒤에 .watchkitapp(애플 관례). 서명은 내보낼 때 자동 서명이 한다.
# 젬: xcodeproj 1.28.1
gem 'xcodeproj', '1.28.1'
require 'xcodeproj'
require 'fileutils'

ios = File.expand_path(ARGV[0] || abort('쓰는 법: ruby add-watch.rb <ios/App 경로>'))
kit = File.expand_path('watch', __dir__)
project = Xcodeproj::Project.open(File.join(ios, 'App.xcodeproj'))
if project.targets.any? { |t| t.name == 'KkukWatch' }
  puts 'watch: 이미 있음'
  exit 0
end
app = project.targets.find { |t| t.name == 'App' } or abort('App 타깃이 없음')

dir = File.join(ios, 'KkukWatch')
FileUtils.mkdir_p(dir)
Dir[File.join(kit, '*')].each { |f| FileUtils.cp_r(f, dir) }

w = project.new_target(:application, 'KkukWatch', :watchos, '9.0', nil, :swift)
group = project.main_group.new_group('KkukWatch', 'KkukWatch')
Dir[File.join(dir, '*')].sort.each do |f|
  ref = group.new_reference(File.basename(f))
  if f.end_with?('.swift')
    w.add_file_references([ref])
  elsif f.end_with?('.xcassets')
    w.add_resources([ref])
  end
end

app_cfg = app.build_configurations.to_h { |c| [c.name, c.build_settings] }
bundle = nil
w.build_configurations.each do |c|
  s = c.build_settings
  a = app_cfg[c.name] || app_cfg.values.first
  bundle = "#{a['PRODUCT_BUNDLE_IDENTIFIER']}.watchkitapp"
  s['PRODUCT_NAME'] = 'KkukWatch'
  s['PRODUCT_BUNDLE_IDENTIFIER'] = bundle
  s['INFOPLIST_FILE'] = 'KkukWatch/Info.plist'
  s['GENERATE_INFOPLIST_FILE'] = 'NO'
  s['MARKETING_VERSION'] = a['MARKETING_VERSION']
  s['CURRENT_PROJECT_VERSION'] = a['CURRENT_PROJECT_VERSION']
  s['SDKROOT'] = 'watchos'
  s['WATCHOS_DEPLOYMENT_TARGET'] = '9.0'
  s['TARGETED_DEVICE_FAMILY'] = '4'
  s['SWIFT_VERSION'] = '5.0'
  s['SKIP_INSTALL'] = 'YES'
  s['CODE_SIGN_STYLE'] = 'Automatic'
  s['ASSETCATALOG_COMPILER_APPICON_NAME'] = 'AppIcon'
  s['ENABLE_PREVIEWS'] = 'NO'
  s.delete('ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME')   # 강조색 칸은 두지 않는다(없는 색이라는 경고가 나지 않게)
  s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks']
  s['DEVELOPMENT_TEAM'] = a['DEVELOPMENT_TEAM'] if a['DEVELOPMENT_TEAM']
end

app.add_dependency(w)
embed = app.new_copy_files_build_phase('Embed Watch Content')
embed.dst_subfolder_spec = '16'                     # 만든 결과물 폴더 기준
embed.dst_path = '$(CONTENTS_FOLDER_PATH)/Watch'    # App.app/Watch/KkukWatch.app
bf = embed.add_file_reference(w.product_reference, true)
bf.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }

project.save
puts "watch: 붙임(번들 #{bundle}, watchOS 9.0, 파일 #{Dir[File.join(kit, '*')].size}개)"
