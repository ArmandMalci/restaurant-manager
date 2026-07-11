# This is a list of issues created by Armand. After doing a QA these are the things I want to change/fix.

Route /

- Users should be able to also login via a user name which should also be a unique one.
- Create the superuser concept which will allow admins to manage different restaurants.
- Users should be able to choose which restaurant they are managing/which restaurant they are viewing.
- The app needs to be restaurant url driven (add id to the url) and every page should be restaurant aware.

Main layout

- inconsistent spacing around main content. example: Service screen has inconsistent spacing around the content compared to floor screen.

General

- use modals instead of drawers. Modals should be url driven. in mobile the modal should be full screen like a new page.
- dont use native select inputs. use custom created ones from our lib (if there is none pull it from shadcn)
- longer sessions. make sessions last 15 days.
- There is a screen missing about users and what access they have in the app per feature.
  Managers can create roles and assign them to users to control what they can do in the app. the roles include specific permissions for each feature.

/floor

- a restaurant can have multiple floors. brainstorm to best solve this.
- User should be able to delete a table and/or a floor (which also deletes the tables inside the floor) no matter what layout he is watching.
- Make the status chips different colors for each status inside the modals and add a help description that by pressing the chip it changes the status.
- the change/create order looks bad how it is connected. lets brainstorm to find a better solution.

/order

- these screens also need some changes on the UX. lets brainstorm to find a better solution.

/door

- rename this concept to reservations
- make the notes a textarea

/checkout

- if people are paying with cash, add a helping feature where it lets the user enter the amount of cash they are paying with and automatically calculates the change. some people might pay with different currencies, so the app should support multiple currencies. and also can give you like 20 euros and 20 pounds for a 35 euro bill.

/kds

- also needs a better UX and UI
-

/calendar

- it should be a month view calendar. lets brainstorm from there about how it should look and work.

/reports

- also needs a better UX and UI
- people should be able to see the day by day report. Brainstorm from there about how it should look and work.
