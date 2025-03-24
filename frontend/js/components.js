document.addEventListener('DOMContentLoaded', function() {
    // Load header - update path to point to root instead of components folder
    fetch('header.html')
        .then(response => response.text())
        .then(data => {
            document.querySelector('header.header').innerHTML = data;
            
            // Highlight the active page in the navigation
            const currentPage = window.location.pathname.split('/').pop();
            if (currentPage === 'messages.html') {
                document.querySelector('.messages-button').classList.add('active');
            } else if (currentPage === 'index.html' || currentPage === '') {
                document.querySelector('.home-button').classList.add('active');
            } else if (currentPage === 'profile.html') {
                document.querySelector('.profile-button').classList.add('active');
            }
            
            // Add event listeners for logout and profile buttons
            document.getElementById('logoutButton').addEventListener('click', function() {
                // Handle logout
                fetch('/api/auth/logout', {
                    credentials: 'include'
                })
                .then(() => {
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                })
                .catch(error => {
                    console.error('Logout error:', error);
                    window.location.href = 'login.html';
                });
            });
            
            document.getElementById('profileButton').addEventListener('click', function() {
                document.getElementById('profileDropdown').classList.toggle('show');
            });
            
            // Close dropdown when clicking outside
            window.addEventListener('click', function(event) {
                if (!event.target.matches('.profile-button')) {
                    const dropdowns = document.getElementsByClassName('dropdown-content');
                    for (let i = 0; i < dropdowns.length; i++) {
                        const openDropdown = dropdowns[i];
                        if (openDropdown.classList.contains('show')) {
                            openDropdown.classList.remove('show');
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Failed to load header:', error);
        });
    
    // Load footer - update path to point to root instead of components folder
    fetch('footer.html')
        .then(response => response.text())
        .then(data => {
            document.querySelector('footer.footer').innerHTML = data;
        })
        .catch(error => {
            console.error('Failed to load footer:', error);
        });
});