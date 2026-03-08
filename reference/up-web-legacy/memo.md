### user table
- add
  - is_system_admin : boolean
  auth_provider auth_provider_type DEFAULT 'email',
  auth_provider_id TEXT,

### workspace
- add 
  - website_url TEXT,
  - 
### workspace_members
- add  : member招待に以下の項目を追加する
  - email TEXT,
  - invited_by UUID REFERENCES users(id),
  - role workspace_role DEFAULT 'member',
  - status member_status DEFAULT 'active',
  - invited_at TIMESTAMP,
  - joined_at TIMESTAMP,




### add this table
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- UI設定
  darkmode TEXT NOT NULL DEFAULT 'system',
  theme TEXT NOT NULL DEFAULT 'default',

  -- 通知設定
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  notification_frequency notification_frequency_enum DEFAULT 'realtime',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);





  in WorkspaceLayout (at Server)
  in RootLayout (at Server)

as is : ここに謎の footerみたいな sectionが存在する
to be : 削除


as is : when user reload the screen, or switch session in the screen. agent will be stop.
to be : agent should be continue running, with out user watching.

for this, it need a table for save the session information(maybe)

i already implemented this feature in 


reload or session switchで、backgroundで動いている -> OK

- user control
  - as is : when a agent is running on background, user can not input message in another session. this is not good.
  - to be : user should be able to input message in another session. 

- displaying, agent is running
  - as is : agent is running on background, but user can not see it.
  - to be : agent is running on background, and user can see it on session list.




### button

-<div class="flex h-14 items-cent...">
  <a ...>
  🎬
AD-Agent
</div>
  in MypageLayout (at Server)
  in RootLayout (at Server)


  - as is : redirect to /
  - to be : do nothing


-<a class="flex items-center ga..." href="/mypage">
  <svg ...>
  マイページ
</a>
  in MypageLayout (at Server)
  in RootLayout (at Server)

  - to be : delete this menu and route


- <p class="font-medium truncate">
  Admin User
</p>
  in MypageLayout (at Server)
  in RootLayout (at Server)

  - as is : it do not display the user name
  - to be : display the user name from database, users.display_name



- <input class="flex h-9 w-full roun..." placeholder="検索..." />
  in Input (at Server)
  in WorkspacesPage (at Server)
  in MypageLayout (at Server)

  - to be : delete this search bar